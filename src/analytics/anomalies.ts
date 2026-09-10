import type { CategoryShare } from './breakdown'
import { isExpense, isSpending, spendOf } from './filters'
import { median, quantile } from './stats'
import { DAY, dayKey, daysInMonth, monthEnd, monthKey, monthStart } from './time'
import type { AnalyticsContext, CategoryId, NormalizedTx } from './types'

const MIN_UNUSUAL = 50000

export interface UnusualTx {
  tx: NormalizedTx
  /** typical amount at this merchant (or category) */
  baseline: number
  ratio: number
}

export function unusualTransactions(txs: NormalizedTx[], ctx: AnalyticsContext, limit = 5): UnusualTx[] {
  const byMerchant = new Map<string, number[]>()
  const byCategory = new Map<CategoryId, number[]>()
  for (const t of txs) {
    if (!isExpense(t, ctx.includeTransfers)) continue
    const m = byMerchant.get(t.merchantKey)
    if (m) m.push(-t.amountUah)
    else byMerchant.set(t.merchantKey, [-t.amountUah])
    const c = byCategory.get(t.category)
    if (c) c.push(-t.amountUah)
    else byCategory.set(t.category, [-t.amountUah])
  }

  const start = monthStart(ctx.month)
  const end = monthEnd(ctx.month)
  const out: UnusualTx[] = []
  for (const t of txs) {
    if (t.time < start || t.time >= end || !isExpense(t, ctx.includeTransfers)) continue
    const amount = -t.amountUah
    if (amount < MIN_UNUSUAL) continue
    const merchant = byMerchant.get(t.merchantKey) ?? []
    const category = byCategory.get(t.category) ?? []
    const merchantMedian = merchant.length >= 3 ? median(merchant) : 0
    const categoryP95 = category.length >= 10 ? quantile(category, 0.95) : 0
    const threshold = Math.max(3 * merchantMedian, categoryP95)
    if (threshold <= 0 || amount <= threshold) continue
    const baseline = merchantMedian || median(category)
    out.push({ tx: t, baseline: Math.round(baseline), ratio: baseline > 0 ? amount / baseline : 0 })
  }
  return out.sort((a, b) => a.tx.amountUah - b.tx.amountUah).slice(0, limit)
}

/** Day keys of every loaded day that is not in the future. */
export function elapsedDayKeys(ctx: AnalyticsContext): string[] {
  const today = dayKey(ctx.now)
  const keys: string[] = []
  for (const month of ctx.available) {
    for (let d = 1; d <= daysInMonth(month); d++) {
      const key = `${month}-${String(d).padStart(2, '0')}`
      if (key <= today) keys.push(key)
    }
  }
  return keys.sort()
}

export function dailySpend(txs: NormalizedTx[], includeTransfers: boolean): Map<string, number> {
  const totals = new Map<string, number>()
  for (const t of txs) {
    if (!isSpending(t, includeTransfers)) continue
    const key = dayKey(t.time)
    totals.set(key, (totals.get(key) ?? 0) + spendOf(t))
  }
  return totals
}

export interface UnusualDay {
  date: string
  amount: number
  median: number
}

export function unusualDays(txs: NormalizedTx[], ctx: AnalyticsContext): UnusualDay[] {
  const totals = dailySpend(txs, ctx.includeTransfers)
  const values = elapsedDayKeys(ctx).map((k) => totals.get(k) ?? 0)
  if (values.length < 14) return []
  const med = median(values)
  const mad = median(values.map((v) => Math.abs(v - med)))
  const threshold = med + 3 * Math.max(mad, med * 0.5, 10000)
  const prefix = `${ctx.month}-`
  return elapsedDayKeys(ctx)
    .filter((k) => k.startsWith(prefix))
    .map((date) => ({ date, amount: totals.get(date) ?? 0, median: Math.round(med) }))
    .filter((d) => d.amount > threshold)
    .sort((a, b) => b.amount - a.amount)
}

export interface CategorySpike {
  id: CategoryId
  amount: number
  projected: number
  ratio: number
}

export function categorySpikes(shares: CategoryShare[], ctx: AnalyticsContext): CategorySpike[] {
  const isCurrent = monthKey(ctx.now) === ctx.month
  const scale = isCurrent ? (daysInMonth(ctx.month) * DAY) / Math.max(ctx.now - monthStart(ctx.month), DAY) : 1
  return shares
    .filter((s) => s.id !== 'transfers' && s.avg3 !== null && s.avg3 > 0 && s.amount > 1.5 * s.avg3 && s.amount * scale > 100000)
    .map((s) => ({ id: s.id, amount: s.amount, projected: Math.round(s.amount * scale), ratio: s.amount / (s.avg3 ?? 1) }))
    .sort((a, b) => b.ratio - a.ratio)
}

export function biggestPurchases(txs: NormalizedTx[], ctx: AnalyticsContext, n = 10): NormalizedTx[] {
  const start = monthStart(ctx.month)
  const end = monthEnd(ctx.month)
  return txs
    .filter((t) => t.time >= start && t.time < end && isExpense(t, ctx.includeTransfers))
    .sort((a, b) => a.amountUah - b.amountUah)
    .slice(0, n)
}
