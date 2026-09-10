import { between, isSpending, spendOf, totalIncome, totalSpend } from './filters'
import { addMonths, daysInMonth, kyivParts, monthEnd, monthKey, monthStart } from './time'
import type { AnalyticsContext, NormalizedTx } from './types'

/** Cumulative spend at the end of each day; truncated at the day of `until` when it falls inside the month. */
export function cumulativeSpend(txs: NormalizedTx[], month: string, includeTransfers: boolean, until?: number): number[] {
  const days = daysInMonth(month)
  const end = monthEnd(month)
  const daily = new Array<number>(days).fill(0)
  for (const t of between(txs, monthStart(month), Math.min(end, until ?? Number.POSITIVE_INFINITY))) {
    if (isSpending(t, includeTransfers)) daily[kyivParts(t.time).day - 1] += spendOf(t)
  }
  const length = until !== undefined && until < end ? kyivParts(until).day : days
  const out: number[] = []
  let acc = 0
  for (let i = 0; i < length; i++) {
    acc += daily[i]
    out.push(acc)
  }
  return out
}

const atDay = (series: number[], day: number) => (series.length ? series[Math.min(Math.max(day, 1), series.length) - 1] : 0)
const last = (series: number[]) => (series.length ? series[series.length - 1] : 0)

export interface MonthComparison {
  isCurrent: boolean
  elapsedDays: number
  days: number
  spentToDate: number
  prevToSameDay: number | null
  prevTotal: number | null
  avg3ToSameDay: number | null
  avg3Total: number | null
  lastYearToSameDay: number | null
  lastYearTotal: number | null
  series: { current: number[]; previous: number[] | null; avg3: number[] | null }
}

export function compareMonth(txs: NormalizedTx[], ctx: AnalyticsContext): MonthComparison {
  const isCurrent = monthKey(ctx.now) === ctx.month
  const days = daysInMonth(ctx.month)
  const current = cumulativeSpend(txs, ctx.month, ctx.includeTransfers, isCurrent ? ctx.now : undefined)
  const elapsedDays = current.length
  const full = (month: string) => (ctx.available.has(month) ? cumulativeSpend(txs, month, ctx.includeTransfers) : null)

  const previous = full(addMonths(ctx.month, -1))
  const prior = [1, 2, 3].map((i) => full(addMonths(ctx.month, -i))).filter((s): s is number[] => s !== null)
  const avg3 = prior.length
    ? Array.from({ length: days }, (_, i) => Math.round(prior.reduce((sum, s) => sum + atDay(s, i + 1), 0) / prior.length))
    : null
  const lastYear = full(addMonths(ctx.month, -12))

  return {
    isCurrent,
    elapsedDays,
    days,
    spentToDate: last(current),
    prevToSameDay: previous ? atDay(previous, elapsedDays) : null,
    prevTotal: previous ? last(previous) : null,
    avg3ToSameDay: avg3 ? atDay(avg3, elapsedDays) : null,
    avg3Total: prior.length ? Math.round(prior.reduce((sum, s) => sum + last(s), 0) / prior.length) : null,
    lastYearToSameDay: lastYear ? atDay(lastYear, elapsedDays) : null,
    lastYearTotal: lastYear ? last(lastYear) : null,
    series: { current, previous, avg3 },
  }
}

export interface CashflowPoint {
  month: string
  income: number
  spent: number
  net: number
}

export function cashflow(txs: NormalizedTx[], ctx: AnalyticsContext): CashflowPoint[] {
  return [...ctx.available].sort().map((month) => {
    const list = between(txs, monthStart(month), monthEnd(month))
    const income = totalIncome(list)
    const spent = totalSpend(list, ctx.includeTransfers)
    return { month, income, spent, net: income - spent }
  })
}
