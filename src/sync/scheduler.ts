import { MonoApiError, type MonoClient, STATEMENT_PAGE_LIMIT } from '../api/mono'
import type { StoredTx } from '../api/types'
import type { Account } from '../analytics/types'
import { type Store, coverageKey } from '../store/types'
import { HISTORY_MONTHS, type SyncJob, buildQueue } from './plan'

export const REQUEST_INTERVAL_MS = 61_000
export const RATE_LIMIT_BACKOFF_MS = 65_000
export const MAX_ATTEMPTS = 3
/** delay before trying a second account to find out whether the limit is per account */
export const PROBE_GAP_MS = 3_000
/** minimal gap between any two requests once the limit is known to be per account */
export const MIN_GAP_MS = 1_000

export type SyncState = 'idle' | 'waiting' | 'fetching' | 'rateLimited' | 'done' | 'unauthorized' | 'stopped'

/**
 * monobank documents "1 request per 60 s" without saying whether it is per token or per account.
 * We start `unknown`, probe a second account a few seconds after the first request and switch to
 * `perAccount` (every account on its own 61 s timer) or `global` (one request per 61 s) accordingly.
 */
export type LimitMode = 'unknown' | 'perAccount' | 'global'

export interface SyncProgress {
  state: SyncState
  done: number
  total: number
  failed: number
  /** ms timestamp of the next request, when waiting */
  nextRequestAt: number | null
  currentMonth: string | null
  limitMode: LimitMode
}

export const INITIAL_PROGRESS: SyncProgress = {
  state: 'idle', done: 0, total: 0, failed: 0, nextRequestAt: null, currentMonth: null, limitMode: 'unknown',
}

export interface SchedulerOptions {
  client: MonoClient
  store: Store
  accounts: Account[]
  months?: number
  now?: () => number
  onProgress?: (progress: SyncProgress) => void
  onData?: () => void
}

export interface SyncScheduler {
  run(): Promise<SyncProgress>
  stop(): void
}

class StoppedError extends Error {}

export function createSyncScheduler(opts: SchedulerOptions): SyncScheduler {
  const now = opts.now ?? (() => Date.now())
  let lastRequestAt: number | null = null
  const lastByAccount = new Map<string, number>()
  let limitMode: LimitMode = 'unknown'
  let stopped = false
  const timers = new Set<{ timer: ReturnType<typeof setTimeout>; reject: (e: Error) => void }>()
  let progress: SyncProgress = { ...INITIAL_PROGRESS }

  const emit = (patch: Partial<SyncProgress>) => {
    progress = { ...progress, ...patch }
    opts.onProgress?.(progress)
  }

  const setLimitMode = (mode: LimitMode) => {
    limitMode = mode
    emit({ limitMode: mode })
  }

  const sleep = (ms: number) =>
    new Promise<void>((resolve, reject) => {
      if (stopped) return reject(new StoppedError())
      if (ms <= 0) return resolve()
      const entry = {
        timer: setTimeout(() => {
          timers.delete(entry)
          resolve()
        }, ms),
        reject,
      }
      timers.add(entry)
    })

  const checkStopped = () => {
    if (stopped) throw new StoppedError()
  }

  function waitMsFor(accountId: string): number {
    if (lastRequestAt === null) return 0
    const t = now()
    const own = lastByAccount.get(accountId)
    const accountWait = own === undefined ? 0 : own + REQUEST_INTERVAL_MS - t
    if (limitMode === 'global') return Math.max(0, lastRequestAt + REQUEST_INTERVAL_MS - t)
    if (limitMode === 'perAccount') return Math.max(0, accountWait, lastRequestAt + MIN_GAP_MS - t)
    return Math.max(0, accountWait, lastRequestAt + PROBE_GAP_MS - t)
  }

  async function throttledStatement(accountId: string, from: number, to: number) {
    for (;;) {
      const waitMs = waitMsFor(accountId)
      if (waitMs > 0) {
        emit({ state: 'waiting', nextRequestAt: now() + waitMs })
        await sleep(waitMs)
      }
      checkStopped()
      const probing = limitMode === 'unknown' && lastRequestAt !== null && now() - lastRequestAt < REQUEST_INTERVAL_MS
      emit({ state: 'fetching', nextRequestAt: null })
      lastRequestAt = now()
      lastByAccount.set(accountId, lastRequestAt)
      try {
        const page = await opts.client.getStatement(accountId, from, to)
        if (probing) setLimitMode('perAccount')
        return page
      } catch (error) {
        if (error instanceof MonoApiError && error.status === 429) {
          if (limitMode !== 'global') setLimitMode('global')
          emit({ state: 'rateLimited', nextRequestAt: now() + RATE_LIMIT_BACKOFF_MS })
          await sleep(RATE_LIMIT_BACKOFF_MS)
          continue
        }
        throw error
      }
    }
  }

  async function fetchJob(job: SyncJob): Promise<StoredTx[]> {
    const all = new Map<string, StoredTx>()
    let to = job.to
    for (;;) {
      const page = await throttledStatement(job.accountId, job.from, to)
      for (const it of page) all.set(it.id, { ...it, accountId: job.accountId })
      if (page.length < STATEMENT_PAGE_LIMIT) break
      const oldest = Math.min(...page.map((it) => it.time))
      if (oldest <= job.from) break
      to = oldest === to ? oldest - 1 : oldest
    }
    return [...all.values()]
  }

  async function runJob(job: SyncJob): Promise<'ok' | 'failed' | 'unauthorized'> {
    for (let attempt = 1; ; attempt++) {
      try {
        const items = await fetchJob(job)
        await opts.store.putTransactions(items)
        await opts.store.putCoverage({
          key: coverageKey(job.accountId, job.month),
          accountId: job.accountId,
          month: job.month,
          status: job.closesMonth ? 'complete' : 'partial',
          fetchedUntil: job.to,
        })
        return 'ok'
      } catch (error) {
        if (error instanceof StoppedError) throw error
        if (error instanceof MonoApiError && (error.status === 401 || error.status === 403)) return 'unauthorized'
        if (attempt >= MAX_ATTEMPTS) {
          await opts.store.putCoverage({
            key: coverageKey(job.accountId, job.month),
            accountId: job.accountId,
            month: job.month,
            status: 'failed',
            fetchedUntil: 0,
          })
          return 'failed'
        }
      }
    }
  }

  return {
    async run() {
      const coverage = await opts.store.getCoverage()
      const queue = buildQueue(opts.accounts, coverage, Math.floor(now() / 1000), opts.months ?? HISTORY_MONTHS)
      emit({ state: queue.length ? 'waiting' : 'done', total: queue.length, done: 0, failed: 0 })
      try {
        for (const job of queue) {
          checkStopped()
          emit({ currentMonth: job.month })
          const result = await runJob(job)
          if (result === 'unauthorized') {
            emit({ state: 'unauthorized', nextRequestAt: null })
            return progress
          }
          emit({ done: progress.done + 1, failed: progress.failed + (result === 'failed' ? 1 : 0) })
          if (result === 'ok') opts.onData?.()
        }
        emit({ state: 'done', nextRequestAt: null, currentMonth: null })
      } catch (error) {
        if (!(error instanceof StoppedError)) throw error
        emit({ state: 'stopped', nextRequestAt: null })
      }
      return progress
    },
    stop() {
      stopped = true
      for (const entry of timers) {
        clearTimeout(entry.timer)
        entry.reject(new StoppedError())
      }
      timers.clear()
    },
  }
}
