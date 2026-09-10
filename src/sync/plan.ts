import { DAY, addMonths, monthEnd, monthKey, monthStart } from '../analytics/time'
import type { Account, AccountKind } from '../analytics/types'
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

const KIND_ORDER: AccountKind[] = ['card', 'fop', 'jar']

export function buildQueue(accounts: Account[], coverage: CoverageEntry[], nowSec: number, months = HISTORY_MONTHS): SyncJob[] {
  const byKey = new Map(coverage.map((c) => [c.key, c]))
  const current = monthKey(nowSec)
  const ordered = KIND_ORDER.flatMap((kind) => accounts.filter((a) => a.kind === kind))
  const jobs: SyncJob[] = []

  for (let offset = 0; offset < months; offset++) {
    const month = addMonths(current, -offset)
    const start = monthStart(month)
    const isCurrent = offset === 0
    const to = isCurrent ? nowSec : monthEnd(month) - 1
    for (const account of ordered) {
      const entry = byKey.get(coverageKey(account.id, month))
      if (entry?.status === 'complete') continue
      const from = entry?.status === 'partial' ? Math.max(start, entry.fetchedUntil - REFETCH_OVERLAP_SEC) : start
      if (from > to) continue
      jobs.push({ accountId: account.id, month, from, to, closesMonth: !isCurrent })
    }
  }
  return jobs
}
