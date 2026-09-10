import { between, isExpense, totalIncome, totalSpend } from './filters'
import { addMonths, monthEnd, monthKey, monthStart } from './time'
import type { AnalyticsContext, NormalizedTx } from './types'

export interface MonthSummary {
  month: string
  spent: number
  income: number
  cashback: number
  saved: number
  net: number
  count: number
  avgCheck: number
}

export function monthSummary(txs: NormalizedTx[], month: string, includeTransfers: boolean, until?: number): MonthSummary {
  const list = between(txs, monthStart(month), Math.min(monthEnd(month), until ?? Number.POSITIVE_INFINITY))
  const spent = totalSpend(list, includeTransfers)
  const income = totalIncome(list)
  let cashback = 0
  let saved = 0
  let expenseSum = 0
  let count = 0
  for (const t of list) {
    cashback += t.cashbackUah
    if (t.kind === 'internal' && t.accountKind !== 'jar' && t.counterKind === 'jar') saved -= t.amountUah
    if (isExpense(t, includeTransfers)) {
      count++
      expenseSum -= t.amountUah
    }
  }
  return { month, spent, income, cashback, saved, net: income - spent, count, avgCheck: count ? Math.round(expenseSum / count) : 0 }
}

export function ratioChange(current: number, previous: number): number | null {
  return previous > 0 ? (current - previous) / previous : null
}

type DeltaKey = 'spent' | 'income' | 'cashback' | 'saved'

export interface SummaryWithDelta {
  current: MonthSummary
  previous: MonthSummary | null
  /** true when the previous month is cut at the same elapsed time (current month view) */
  comparedToSameDay: boolean
  deltas: Record<DeltaKey, number | null>
}

export function summaryWithDelta(txs: NormalizedTx[], ctx: AnalyticsContext): SummaryWithDelta {
  const current = monthSummary(txs, ctx.month, ctx.includeTransfers)
  const prevMonth = addMonths(ctx.month, -1)
  const isCurrent = monthKey(ctx.now) === ctx.month
  let previous: MonthSummary | null = null
  if (ctx.available.has(prevMonth)) {
    const until = isCurrent ? monthStart(prevMonth) + (ctx.now - monthStart(ctx.month)) : undefined
    previous = monthSummary(txs, prevMonth, ctx.includeTransfers, until)
  }
  const delta = (key: DeltaKey) => (previous ? ratioChange(current[key], previous[key]) : null)
  return {
    current,
    previous,
    comparedToSameDay: isCurrent,
    deltas: { spent: delta('spent'), income: delta('income'), cashback: delta('cashback'), saved: delta('saved') },
  }
}
