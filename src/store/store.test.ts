import { deleteDB } from 'idb'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { StoredTx } from '../api/types'
import { DB_NAME, openStore } from './db'
import { createMemoryStore } from './memory'
import type { Store } from './types'

const tx = (id: string, amount = -100): StoredTx => ({
  id, accountId: 'a', time: 1, description: 'x', mcc: 5411, hold: false, amount, operationAmount: amount,
  currencyCode: 980, commissionRate: 0, cashbackAmount: 0, balance: 0,
})

const factories: Array<[string, () => Promise<Store>]> = [
  ['memory', async () => createMemoryStore()],
  ['indexeddb', async () => (await openStore()).store],
]

describe.each(factories)('%s store', (_name, make) => {
  let store: Store
  beforeEach(async () => {
    await deleteDB(DB_NAME)
    store = await make()
  })
  afterEach(() => store.close())

  it('upserts transactions by id', async () => {
    await store.putTransactions([tx('1'), tx('2')])
    await store.putTransactions([tx('1', -500)])
    const all = await store.getAllTransactions()
    expect(all).toHaveLength(2)
    expect(all.find((t) => t.id === '1')?.amount).toBe(-500)
  })

  it('replaces accounts', async () => {
    await store.putAccounts([{ id: 'a', kind: 'card', title: 'A', currencyCode: 980, balance: 0 }])
    await store.putAccounts([{ id: 'b', kind: 'jar', title: 'B', currencyCode: 980, balance: 0 }])
    expect((await store.getAccounts()).map((a) => a.id)).toEqual(['b'])
  })

  it('upserts coverage and meta', async () => {
    await store.putCoverage({ key: 'a:2026-09', accountId: 'a', month: '2026-09', status: 'partial', fetchedUntil: 5 })
    await store.putCoverage({ key: 'a:2026-09', accountId: 'a', month: '2026-09', status: 'complete', fetchedUntil: 9 })
    expect(await store.getCoverage()).toEqual([{ key: 'a:2026-09', accountId: 'a', month: '2026-09', status: 'complete', fetchedUntil: 9 }])
    await store.setMeta('rates', { 840: 41 })
    expect(await store.getMeta('rates')).toEqual({ 840: 41 })
    expect(await store.getMeta('missing')).toBeUndefined()
  })

  it('clears everything', async () => {
    await store.putTransactions([tx('1')])
    await store.setMeta('k', 1)
    await store.clear()
    expect(await store.getAllTransactions()).toEqual([])
    expect(await store.getMeta('k')).toBeUndefined()
  })
})

describe('openStore', () => {
  it('reports persistence when IndexedDB is available', async () => {
    const { store, persistent } = await openStore()
    expect(persistent).toBe(true)
    store.close()
  })
})
