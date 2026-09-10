import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MonoApiError, type MonoClient } from '../api/mono'
import type { MonoClientInfo, MonoStatementItem } from '../api/types'
import { createMemoryStore } from '../store/memory'
import { type AppDeps, availableMonths, createAppStore } from './appStore'

const NOW_MS = Date.UTC(2026, 8, 10, 9)
const info: MonoClientInfo = {
  clientId: 'c1', name: 'Тест',
  accounts: [{ id: 'black', balance: 0, type: 'black', currencyCode: 980, iban: 'UA1' }],
  jars: [],
}
const item = (id: string): MonoStatementItem => ({
  id, time: NOW_MS / 1000 - 3600, description: 'АТБ', mcc: 5411, hold: false, amount: -12000, operationAmount: -12000,
  currencyCode: 980, commissionRate: 0, cashbackAmount: 0, balance: 0,
})

function setup(overrides: Partial<MonoClient> = {}) {
  const store = createMemoryStore()
  const getStatement = vi.fn<MonoClient['getStatement']>(async () => [item('a')])
  const getClientInfo = vi.fn<MonoClient['getClientInfo']>(async () => info)
  const deps: AppDeps = {
    openStore: async () => ({ store, persistent: true }),
    createClient: () => ({ getClientInfo, getStatement, ...overrides }),
    getCurrency: async () => [],
    now: () => Date.now(),
    runExclusive: async (task) => {
      void task()
      return true
    },
  }
  return { store, getStatement, app: createAppStore(deps) }
}

describe('app store', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW_MS)
    localStorage.clear()
    sessionStorage.clear()
  })
  afterEach(() => vi.useRealTimers())

  it('connects, stores the token for the session and fetches the first statement right away', async () => {
    const { app, getStatement } = setup()
    await app.actions.connect('  secret  ', false)
    await vi.advanceTimersByTimeAsync(0)
    const s = app.getState()
    expect(s).toMatchObject({ phase: 'dashboard', mode: 'live', error: null })
    expect(s.accounts.map((a) => a.id)).toEqual(['black'])
    expect(sessionStorage.getItem('monotrat.token')).toBe('secret')
    expect(localStorage.getItem('monotrat.token')).toBeNull()
    expect(getStatement).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => expect(app.getState().txs).toHaveLength(1))
    expect(app.getState().available).toEqual(['2026-09'])
    await app.actions.logout()
  })

  it('remembers the token when asked', async () => {
    const { app } = setup()
    await app.actions.connect('secret', true)
    expect(localStorage.getItem('monotrat.token')).toBe('secret')
    await app.actions.logout()
  })

  it('shows a friendly error for a bad token', async () => {
    const { app } = setup({ getClientInfo: async () => { throw new MonoApiError(403, "Unknown 'X-Token'") } })
    await app.actions.connect('bad', false)
    expect(app.getState()).toMatchObject({ phase: 'onboarding', mode: null })
    expect(app.getState().error).toContain('Токен не підійшов')
    expect(sessionStorage.getItem('monotrat.token')).toBeNull()
  })

  it('logs out and wipes cached data', async () => {
    const { app, store } = setup()
    await app.actions.connect('secret', true)
    await vi.advanceTimersByTimeAsync(61_000)
    await app.actions.logout()
    expect(app.getState()).toMatchObject({ phase: 'onboarding', mode: null, txs: [] })
    expect(localStorage.getItem('monotrat.token')).toBeNull()
    expect(await store.getAllTransactions()).toEqual([])
  })

  it('boots straight into the dashboard from cache when a token is saved', async () => {
    const { app, store } = setup()
    await app.actions.connect('secret', true)
    await vi.advanceTimersByTimeAsync(61_000)
    const second = createAppStore({
      openStore: async () => ({ store, persistent: true }),
      createClient: () => ({ getClientInfo: async () => info, getStatement: async () => [] }),
      getCurrency: async () => [],
      now: () => Date.now(),
      runExclusive: async () => true,
    })
    await second.actions.boot()
    expect(second.getState()).toMatchObject({ phase: 'dashboard', mode: 'live' })
    expect(second.getState().txs).toHaveLength(1)
    await app.actions.logout()
  })

  it('starts the demo without any network', () => {
    const { app } = setup()
    app.actions.startDemo()
    const s = app.getState()
    expect(s).toMatchObject({ phase: 'dashboard', mode: 'demo' })
    expect(s.available).toHaveLength(13)
    expect(s.txs.length).toBeGreaterThan(100)
  })
})

describe('availableMonths', () => {
  it('requires every card to be loaded for a month', () => {
    const accounts = [
      { id: 'b', kind: 'card' as const, title: 'b', currencyCode: 980, balance: 0 },
      { id: 'w', kind: 'card' as const, title: 'w', currencyCode: 980, balance: 0 },
      { id: 'j', kind: 'jar' as const, title: 'j', currencyCode: 980, balance: 0 },
    ]
    const entry = (accountId: string, month: string, status: 'complete' | 'partial' | 'failed' = 'complete') =>
      ({ key: `${accountId}:${month}`, accountId, month, status, fetchedUntil: 0 })
    expect(availableMonths(accounts, [
      entry('b', '2026-09', 'partial'), entry('w', '2026-09', 'partial'),
      entry('b', '2026-08'), entry('w', '2026-08', 'failed'),
      entry('b', '2026-07'),
    ])).toEqual(['2026-09'])
  })
})
