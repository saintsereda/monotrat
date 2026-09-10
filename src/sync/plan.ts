import { DAY, addMonths, monthEnd, monthKey, monthStart } from '../analytics/time'
import type { Account } from '../analytics/types'
import { type CoverageEntry, coverageKey } from '../store/types'

export const HISTORY_MONTHS = 13
export const REFETCH_OVERLAP_SEC = 3 * DAY

export interface SyncJob {
  accountId: string
  month: string
  from: number
  to: number
  /** true when a successful fetch makes the month `complete` */
  closesMonth: boolean
}

/** hryvnia black card first, then other hryvnia cards, foreign-currency cards last */
const rank = (a: Account) => (a.currencyCode === 980 ? 0 : 2) + (a.type === 'black' ? 0 : 1)
const byRank = (list: Account[]) => [...list].sort((a, b) => rank(a) - rank(b))

/**
 * Month by month (current first) for cards, then FOP; jars go last — their top-ups are
 * already visible in the card statements, so they matter least for the dashboard.
 */
export function buildQueue(accounts: Account[], coverage: CoverageEntry[], nowSec: number, months = HISTORY_MONTHS): SyncJob[] {
  const byKey = new Map(coverage.map((c) => [c.key, c]))
  const current = monthKey(nowSec)
  const jobs: SyncJob[] = []

  const addJobs = (group: Account[]) => {
    for (let offset = 0; offset < months; offset++) {
      const month = addMonths(current, -offset)
      const start = monthStart(month)
      const isCurrent = offset === 0
      const to = isCurrent ? nowSec : monthEnd(month) - 1
      for (const account of group) {
        const entry = byKey.get(coverageKey(account.id, month))
        if (entry?.status === 'complete') continue
        const from = entry?.status === 'partial' ? Math.max(start, entry.fetchedUntil - REFETCH_OVERLAP_SEC) : start
        if (from > to) continue
        jobs.push({ accountId: account.id, month, from, to, closesMonth: !isCurrent })
      }
    }
  }

  addJobs([...byRank(accounts.filter((a) => a.kind === 'card')), ...byRank(accounts.filter((a) => a.kind === 'fop'))])
  addJobs(accounts.filter((a) => a.kind === 'jar'))
  return jobs
}
