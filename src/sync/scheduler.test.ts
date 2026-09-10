import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MonoApiError, type MonoClient } from '../api/mono'
import type { MonoStatementItem } from '../api/types'
import type { Account } from '../analytics/types'
import { createMemoryStore } from '../store/memory'
import { createSyncScheduler, type SyncProgress } from './scheduler'

const black: Account = { id: 'black', kind: 'card', title: 'Чорна', currencyCode: 980, balance: 0 }
const item = (id: string, time: number): MonoStatementItem => ({
  id, time, description: 'АТБ', mcc: 5411, hold: false, amount: -100, operationAmount: -100,
  currencyCode: 980, commissionRate: 0, cashbackAmount: 0, balance: 0,
})
const clientWith = (getStatement: MonoClient['getStatement']): MonoClient => ({
  getClientInfo: vi.fn(),
  getStatement,
})

describe('sync scheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(Date.UTC(2026, 8, 10, 9)))
  })
  afterEach(() => vi.useRealTimers())

  it('spaces requests 61 s apart and can be stopped', async () => {
    const getStatement = vi.fn(async () => [])
    const scheduler = createSyncScheduler({ client: clientWith(getStatement), store: createMemoryStore(), accounts: [black] })
    const done = scheduler.run()
    await vi.advanceTimersByTimeAsync(0)
    expect(getStatement).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(getStatement).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1_000)
    expect(getStatement).toHaveBeenCalledTimes(2)
    scheduler.stop()
    expect((await done).state).toBe('stopped')
  })

  it('waits for the previous request (e.g. client-info) before the first statement', async () => {
    const getStatement = vi.fn(async () => [])
    const scheduler = createSyncScheduler({
      client: clientWith(getStatement), store: createMemoryStore(), accounts: [black], months: 1, lastRequestAt: Date.now(),
    })
    const done = scheduler.run()
    await vi.advanceTimersByTimeAsync(60_999)
    expect(getStatement).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(getStatement).toHaveBeenCalledTimes(1)
    expect((await done).state).toBe('done')
  })

  it('backs off 65 s on 429 and retries the same window', async () => {
    const getStatement = vi.fn<MonoClient['getStatement']>()
      .mockRejectedValueOnce(new MonoApiError(429, 'Too many requests'))
      .mockResolvedValueOnce([item('a', Date.now() / 1000 - 10)])
    const store = createMemoryStore()
    const states: SyncProgress['state'][] = []
    const scheduler = createSyncScheduler({
      client: clientWith(getStatement), store, accounts: [black], months: 1, onProgress: (p) => states.push(p.state),
    })
    const done = scheduler.run()
    await vi.advanceTimersByTimeAsync(64_999)
    expect(getStatement).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(getStatement).toHaveBeenCalledTimes(2)
    const progress = await done
    expect(states).toContain('rateLimited')
    expect(progress).toMatchObject({ state: 'done', done: 1, total: 1, failed: 0 })
    expect(await store.getAllTransactions()).toHaveLength(1)
    expect((await store.getCoverage())[0]).toMatchObject({ key: 'black:2026-09', status: 'partial' })
  })

  it('stops with unauthorized on 401/403', async () => {
    const getStatement = vi.fn(async () => { throw new MonoApiError(403, "Unknown 'X-Token'") })
    const scheduler = createSyncScheduler({ client: clientWith(getStatement), store: createMemoryStore(), accounts: [black] })
    const done = scheduler.run()
    await vi.advanceTimersByTimeAsync(0)
    expect((await done).state).toBe('unauthorized')
    expect(getStatement).toHaveBeenCalledTimes(1)
  })

  it('paginates when a page has 500 items', async () => {
    const to = Math.floor(Date.now() / 1000)
    const firstPage = Array.from({ length: 500 }, (_, i) => item(`p1-${i}`, to - i))
    const oldest = to - 499
    const getStatement = vi.fn<MonoClient['getStatement']>()
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce([item('p1-499', oldest), item('p2-0', oldest - 5)])
    const store = createMemoryStore()
    const scheduler = createSyncScheduler({ client: clientWith(getStatement), store, accounts: [black], months: 1 })
    const done = scheduler.run()
    await vi.advanceTimersByTimeAsync(61_000)
    await done
    expect(getStatement).toHaveBeenCalledTimes(2)
    expect(getStatement.mock.calls[1][2]).toBe(oldest)
    expect(await store.getAllTransactions()).toHaveLength(501)
  })

  it('marks a window failed after 3 attempts and moves on', async () => {
    const getStatement = vi.fn(async () => { throw new MonoApiError(500, 'boom') })
    const store = createMemoryStore()
    const onData = vi.fn()
    const scheduler = createSyncScheduler({ client: clientWith(getStatement), store, accounts: [black], months: 1, onData })
    const done = scheduler.run()
    await vi.advanceTimersByTimeAsync(2 * 61_000)
    const progress = await done
    expect(getStatement).toHaveBeenCalledTimes(3)
    expect(progress).toMatchObject({ state: 'done', failed: 1, done: 1 })
    expect((await store.getCoverage())[0].status).toBe('failed')
    expect(onData).not.toHaveBeenCalled()
  })
})
