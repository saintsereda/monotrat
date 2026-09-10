import { type DBSchema, type IDBPDatabase, deleteDB, openDB } from 'idb'
import type { Account } from '../analytics/types'
import type { StoredTx } from '../api/types'
import { createMemoryStore } from './memory'
import type { CoverageEntry, Store } from './types'

export const DB_NAME = 'monotrat'
const DB_VERSION = 1

interface MonotratDB extends DBSchema {
  transactions: { key: string; value: StoredTx; indexes: { byTime: number } }
  accounts: { key: string; value: Account }
  coverage: { key: string; value: CoverageEntry }
  meta: { key: string; value: { key: string; value: unknown } }
}

function createIdbStore(db: IDBPDatabase<MonotratDB>): Store {
  return {
    async putTransactions(items) {
      const tx = db.transaction('transactions', 'readwrite')
      await Promise.all([...items.map((item) => tx.store.put(item)), tx.done])
    },
    getAllTransactions: () => db.getAll('transactions'),
    async putAccounts(list) {
      const tx = db.transaction('accounts', 'readwrite')
      await tx.store.clear()
      await Promise.all([...list.map((a) => tx.store.put(a)), tx.done])
    },
    getAccounts: () => db.getAll('accounts'),
    async putCoverage(entry) {
      await db.put('coverage', entry)
    },
    getCoverage: () => db.getAll('coverage'),
    async getMeta<T>(key: string) {
      const row = await db.get('meta', key)
      return row ? (row.value as T) : undefined
    },
    async setMeta(key, value) {
      await db.put('meta', { key, value })
    },
    async clear() {
      const tx = db.transaction(['transactions', 'accounts', 'coverage', 'meta'], 'readwrite')
      await Promise.all([
        tx.objectStore('transactions').clear(),
        tx.objectStore('accounts').clear(),
        tx.objectStore('coverage').clear(),
        tx.objectStore('meta').clear(),
        tx.done,
      ])
    },
    close: () => db.close(),
  }
}

export async function openStore(): Promise<{ store: Store; persistent: boolean }> {
  try {
    if (typeof indexedDB === 'undefined') throw new Error('IndexedDB unavailable')
    const db = await openDB<MonotratDB>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        database.createObjectStore('transactions', { keyPath: 'id' }).createIndex('byTime', 'time')
        database.createObjectStore('accounts', { keyPath: 'id' })
        database.createObjectStore('coverage', { keyPath: 'key' })
        database.createObjectStore('meta', { keyPath: 'key' })
      },
    })
    return { store: createIdbStore(db), persistent: true }
  } catch {
    return { store: createMemoryStore(), persistent: false }
  }
}

export async function deleteDatabase(): Promise<void> {
  try {
    await deleteDB(DB_NAME)
  } catch {
    // nothing to delete
  }
}
