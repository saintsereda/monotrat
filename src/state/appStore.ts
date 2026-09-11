import { MonoApiError, type MonoClient, accountsFromClientInfo } from '../api/mono'
import type { MonoCurrencyRate } from '../api/types'
import { type RateTable, buildRateTable, normalizeAll } from '../analytics/normalize'
import { monthKey, recentMonths } from '../analytics/time'
import type { Account, NormalizedTx } from '../analytics/types'
import { DEMO_MONTHS, generateDemo } from '../demo/generate'
import { logoResolver } from '../logos/search'
import type { CoverageEntry, Store } from '../store/types'
import { INITIAL_PROGRESS, type SyncProgress, type SyncScheduler, createSyncScheduler } from '../sync/scheduler'
import { clearToken, loadToken, saveToken } from './token'

export type Phase = 'boot' | 'onboarding' | 'connecting' | 'dashboard'

export interface AppState {
  phase: Phase
  mode: 'live' | 'demo' | null
  error: string | null
  accounts: Account[]
  txs: NormalizedTx[]
  /** month keys with data for every card, newest first */
  available: string[]
  progress: SyncProgress
  selectedMonth: string
  includeTransfers: boolean
  persistent: boolean
  /** another tab holds the sync lock */
  syncElsewhere: boolean
  /** unix seconds */
  now: number
}

export interface AppDeps {
  openStore: () => Promise<{ store: Store; persistent: boolean }>
  createClient: (token: string) => MonoClient
  getCurrency: () => Promise<MonoCurrencyRate[]>
  /** ms */
  now: () => number
  /** runs the task unless another tab already syncs; resolves false in that case */
  runExclusive: (task: () => Promise<void>) => Promise<boolean>
}

const RATES_TTL_MS = 60 * 60 * 1000

export function availableMonths(accounts: Account[], coverage: CoverageEntry[]): string[] {
  const cards = accounts.filter((a) => a.kind === 'card')
  const required = cards.length ? cards : accounts
  if (!required.length) return []
  const loaded = new Set(coverage.filter((c) => c.status !== 'failed').map((c) => c.key))
  const months = new Set(coverage.map((c) => c.month))
  return [...months].filter((m) => required.every((a) => loaded.has(`${a.id}:${m}`))).sort().reverse()
}

export function errorMessage(error: unknown): string {
  if (error instanceof MonoApiError) {
    if (error.status === 401 || error.status === 403) return 'Токен не підійшов. Перевірте, що скопіювали його повністю з api.monobank.ua.'
    if (error.status === 429) return 'monobank просить зачекати: не частіше одного запиту на хвилину. Спробуйте ще раз за хвилину.'
    if (error.status === 0) return "Немає зв'язку з monobank. Перевірте інтернет і спробуйте ще раз."
    return `monobank відповів помилкою (${error.status}). Спробуйте пізніше.`
  }
  return 'Щось пішло не так. Спробуйте ще раз.'
}

export function createAppStore(deps: AppDeps) {
  const nowSec = () => Math.floor(deps.now() / 1000)
  let state: AppState = {
    phase: 'boot',
    mode: null,
    error: null,
    accounts: [],
    txs: [],
    available: [],
    progress: INITIAL_PROGRESS,
    selectedMonth: monthKey(nowSec()),
    includeTransfers: true,
    persistent: true,
    syncElsewhere: false,
    now: nowSec(),
  }
  const listeners = new Set<() => void>()
  const set = (patch: Partial<AppState>) => {
    state = { ...state, ...patch }
    for (const listener of listeners) listener()
  }

  let store: Store | null = null
  let rates: RateTable = { 980: 1 }
  let client: MonoClient | null = null
  let scheduler: SyncScheduler | null = null
  let syncing = false

  async function getStore(): Promise<Store> {
    if (!store) {
      const opened = await deps.openStore()
      store = opened.store
      set({ persistent: opened.persistent })
    }
    return store
  }

  async function loadRates(s: Store): Promise<RateTable> {
    const cached = await s.getMeta<{ table: RateTable; fetchedAt: number }>('rates')
    if (cached && deps.now() - cached.fetchedAt < RATES_TTL_MS) return cached.table
    try {
      const table = buildRateTable(await deps.getCurrency())
      await s.setMeta('rates', { table, fetchedAt: deps.now() })
      return table
    } catch {
      return cached?.table ?? { 980: 1 }
    }
  }

  async function reload(): Promise<void> {
    if (state.mode !== 'live') return
    const s = await getStore()
    const [raw, coverage] = await Promise.all([s.getAllTransactions(), s.getCoverage()])
    if (state.mode !== 'live') return
    set({
      txs: normalizeAll(raw, { accounts: state.accounts, rates }),
      available: availableMonths(state.accounts, coverage),
      now: nowSec(),
    })
  }

  function handleUnauthorized() {
    clearToken()
    client = null
    set({ phase: 'onboarding', mode: null, error: 'Токен більше не дійсний. Згенеруйте новий на api.monobank.ua.' })
  }

  async function startSync(): Promise<void> {
    const activeClient = client
    if (!activeClient || syncing || state.mode !== 'live') return
    syncing = true
    try {
      const s = await getStore()
      const owned = await deps.runExclusive(async () => {
        set({ syncElsewhere: false })
        scheduler = createSyncScheduler({
          client: activeClient,
          store: s,
          accounts: state.accounts,
          now: deps.now,
          onProgress: (progress) => set({ progress }),
          onData: () => void reload(),
        })
        const result = await scheduler.run()
        scheduler = null
        if (result.state === 'stopped') return
        if (result.state === 'unauthorized') handleUnauthorized()
        else await reload()
      })
      if (!owned) set({ syncElsewhere: true })
    } finally {
      syncing = false
    }
  }

  let booted = false

  const actions = {
    async boot(): Promise<void> {
      if (booted) return
      booted = true
      const saved = loadToken()
      if (!saved) {
        set({ phase: 'onboarding' })
        return
      }
      const s = await getStore()
      const accounts = await s.getAccounts()
      if (!accounts.length) {
        await actions.connect(saved.token, saved.remembered)
        return
      }
      client = deps.createClient(saved.token)
      rates = await loadRates(s)
      set({ accounts, mode: 'live', phase: 'dashboard' })
      await reload()
      void startSync()
    },

    async connect(token: string, remember: boolean): Promise<void> {
      const trimmed = token.trim()
      if (!trimmed) {
        set({ error: 'Вставте токен з api.monobank.ua' })
        return
      }
      set({ phase: 'connecting', error: null })
      const nextClient = deps.createClient(trimmed)
      try {
        // client-info and statement have separate limits per the docs, so the first statement goes right away
        const info = await nextClient.getClientInfo()
        const s = await getStore()
        const previousClient = await s.getMeta<string>('clientId')
        if (previousClient && previousClient !== info.clientId) await s.clear()
        await s.setMeta('clientId', info.clientId)
        const accounts = accountsFromClientInfo(info)
        await s.putAccounts(accounts)
        rates = await loadRates(s)
        saveToken(trimmed, remember)
        client = nextClient
        set({ accounts, mode: 'live', phase: 'dashboard', selectedMonth: monthKey(nowSec()) })
        await reload()
        void startSync()
      } catch (error) {
        set({ phase: 'onboarding', error: errorMessage(error) })
      }
    },

    startDemo(): void {
      const now = nowSec()
      const demo = generateDemo(now)
      rates = { 980: 1 }
      set({
        mode: 'demo',
        phase: 'dashboard',
        error: null,
        accounts: demo.accounts,
        txs: normalizeAll(demo.transactions, { accounts: demo.accounts, rates }),
        available: recentMonths(now, DEMO_MONTHS),
        progress: { ...INITIAL_PROGRESS, state: 'done', done: DEMO_MONTHS, total: DEMO_MONTHS },
        selectedMonth: monthKey(now),
        now,
      })
    },

    async logout(): Promise<void> {
      const wasLive = state.mode === 'live'
      scheduler?.stop()
      scheduler = null
      client = null
      clearToken()
      logoResolver().clear()
      set({ phase: 'onboarding', mode: null, accounts: [], txs: [], available: [], progress: INITIAL_PROGRESS, error: null })
      if (wasLive) await (await getStore()).clear()
    },

    resync(): void {
      void startSync()
    },

    selectMonth(month: string): void {
      set({ selectedMonth: month })
    },

    setIncludeTransfers(includeTransfers: boolean): void {
      set({ includeTransfers })
    },

    tick(): void {
      set({ now: nowSec() })
    },
  }

  return {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    actions,
  }
}

export type AppStore = ReturnType<typeof createAppStore>
export type AppActions = AppStore['actions']
