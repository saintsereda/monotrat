import type { Account } from '../analytics/types'
import type { StoredTx } from '../api/types'
import type { CoverageEntry, Store } from './types'

export function createMemoryStore(): Store {
  const txs = new Map<string, StoredTx>()
  let accounts: Account[] = []
  const coverage = new Map<string, CoverageEntry>()
  const meta = new Map<string, unknown>()

  return {
    async putTransactions(items) {
      for (const item of items) txs.set(item.id, structuredClone(item))
    },
    async getAllTransactions() {
      return [...txs.values()].map((t) => structuredClone(t))
    },
    async putAccounts(list) {
      accounts = structuredClone(list)
    },
    async getAccounts() {
      return structuredClone(accounts)
    },
    async putCoverage(entry) {
      coverage.set(entry.key, { ...entry })
    },
    async getCoverage() {
      return [...coverage.values()].map((c) => ({ ...c }))
    },
    async getMeta<T>(key: string) {
      return meta.has(key) ? (structuredClone(meta.get(key)) as T) : undefined
    },
    async setMeta(key, value) {
      meta.set(key, structuredClone(value))
    },
    async clear() {
      txs.clear()
      accounts = []
      coverage.clear()
      meta.clear()
    },
    close() {},
  }
}
