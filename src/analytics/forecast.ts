import { between, isSpending, spendOf, totalIncome, totalSpend } from './filters'
import type { RecurringItem } from './recurring'
import { mean, std } from './stats'
import { DAY, addMonths, dayKey, monthEnd, monthKey, monthStart } from './time'
import type { AnalyticsContext, NormalizedTx } from './types'

export interface Forecast {
  isCurrent: boolean
  spentSoFar: number
  projected: number
  low: number
  high: number
  recurringPending: number
  dailyRate: number
  daysLeft: number
  incomeSoFar: number
  incomePending: number
  incomeProjected: number
  avgIncome3: number | null
}

const BASELINE_DAYS = 90
const TRIM_TOP = 0.05

/** Total of recurring occurrences falling in [from, to). */
function pendingOccurrences(items: RecurringItem[], from: number, to: number): number {
  let sum = 0
  for (const item of items) {
    if (item.cadence === 'yearly') continue
    const step = Math.round(item.intervalDays * DAY)
    for (let t = item.nextTime; t < to && step > 0; t += step) {
      if (t >= from) sum += item.amount
    }
  }
  return sum
}

function dailyTotals(txs: NormalizedTx[], from: number, to: number, include: (t: NormalizedTx) => boolean): number[] {
  const byDay = new Map<string, number>()
  for (let t = from; t < to; t += DAY) byDay.set(dayKey(t + DAY / 2), 0)
  for (const t of between(txs, from, to)) {
    if (!include(t)) continue
    const key = dayKey(t.time)
    byDay.set(key, (byDay.get(key) ?? 0) + spendOf(t))
  }
  return [...byDay.values()]
}

export function forecastMonth(
  txs: NormalizedTx[],
  ctx: AnalyticsContext,
  expenseRecurring: RecurringItem[],
  incomeRecurring: RecurringItem[],
): Forecast {
  const start = monthStart(ctx.month)
  const end = monthEnd(ctx.month)
  const isCurrent = monthKey(ctx.now) === ctx.month
  const until = isCurrent ? ctx.now : end
  const monthTxs = between(txs, start, until)
  const spentSoFar = totalSpend(monthTxs, ctx.includeTransfers)
  const incomeSoFar = totalIncome(monthTxs)

  const prior = [1, 2, 3].map((i) => addMonths(ctx.month, -i)).filter((m) => ctx.available.has(m))
  const avgIncome3 = prior.length
    ? Math.round(mean(prior.map((m) => totalIncome(between(txs, monthStart(m), monthEnd(m))))))
    : null

  if (!isCurrent) {
    const days = (end - start) / DAY
    return {
      isCurrent, spentSoFar, projected: spentSoFar, low: spentSoFar, high: spentSoFar, recurringPending: 0,
      dailyRate: Math.round(spentSoFar / days), daysLeft: 0,
      incomeSoFar, incomePending: 0, incomeProjected: incomeSoFar, avgIncome3,
    }
  }

  const recurringKeys = new Set(expenseRecurring.filter((r) => r.cadence !== 'yearly').map((r) => r.merchantKey))
  const isVariable = (t: NormalizedTx) => isSpending(t, ctx.includeTransfers) && !recurringKeys.has(t.merchantKey)

  const elapsedDays = (ctx.now - start) / DAY
  const daysLeft = (end - ctx.now) / DAY
  let variableMtd = 0
  for (const t of monthTxs) if (isVariable(t)) variableMtd += spendOf(t)
  const rateMtd = variableMtd / Math.max(elapsedDays, 1)

  let rate = rateMtd
  let sigma = 0
  if (ctx.available.has(addMonths(ctx.month, -1))) {
    const earliest = [...ctx.available].sort()[0]
    const from = Math.max(start - BASELINE_DAYS * DAY, monthStart(earliest))
    const days = dailyTotals(txs, from, start, isVariable)
    const sorted = [...days].sort((a, b) => a - b)
    const trimmed = sorted.slice(0, sorted.length - Math.ceil(sorted.length * TRIM_TOP))
    rate = 0.5 * rateMtd + 0.5 * mean(trimmed.length ? trimmed : sorted)
    sigma = std(days)
  }

  const recurringPending = pendingOccurrences(expenseRecurring, ctx.now, end)
  const incomePending = pendingOccurrences(incomeRecurring, ctx.now, end)
  const projected = Math.round(spentSoFar + recurringPending + rate * daysLeft)
  const band = Math.round(sigma * Math.sqrt(daysLeft))

  return {
    isCurrent,
    spentSoFar,
    projected,
    low: Math.max(spentSoFar + recurringPending, projected - band),
    high: projected + band,
    recurringPending,
    dailyRate: Math.round(rate),
    daysLeft: Math.round(daysLeft),
    incomeSoFar,
    incomePending,
    incomeProjected: incomeSoFar + incomePending,
    avgIncome3,
  }
}
