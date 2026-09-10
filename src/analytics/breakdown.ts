import { between, isExpense, isSpending, spendOf } from './filters'
import { addMonths, monthEnd, monthKey, monthStart } from './time'
import type { AnalyticsContext, CategoryId, NormalizedTx } from './types'

export interface CategoryShare {
  id: CategoryId
  amount: number
  share: number
  count: number
  avg3: number | null
  delta: number | null
}

type Totals = Map<CategoryId, { amount: number; count: number }>

function categoryTotals(txs: NormalizedTx[], from: number, to: number, includeTransfers: boolean): Totals {
  const totals: Totals = new Map()
  for (const t of between(txs, from, to)) {
    if (!isSpending(t, includeTransfers)) continue
    const entry = totals.get(t.category) ?? { amount: 0, count: 0 }
    entry.amount += spendOf(t)
    if (isExpense(t, includeTransfers)) entry.count++
    totals.set(t.category, entry)
  }
  return totals
}

export function categoryBreakdown(txs: NormalizedTx[], ctx: AnalyticsContext): CategoryShare[] {
  const start = monthStart(ctx.month)
  const elapsed = monthKey(ctx.now) === ctx.month ? ctx.now - start : Number.POSITIVE_INFINITY
  const window = (month: string) => {
    const s = monthStart(month)
    return categoryTotals(txs, s, Math.min(monthEnd(month), s + elapsed), ctx.includeTransfers)
  }
  const current = window(ctx.month)
  const prior = [1, 2, 3].map((i) => addMonths(ctx.month, -i)).filter((m) => ctx.available.has(m)).map(window)

  const ids = new Set<CategoryId>([...current.keys(), ...prior.flatMap((p) => [...p.keys()])])
  const total = [...current.values()].reduce((sum, e) => sum + Math.max(e.amount, 0), 0)

  const shares = [...ids].map((id): CategoryShare => {
    const amount = Math.max(current.get(id)?.amount ?? 0, 0)
    const avg3 = prior.length
      ? Math.round(prior.reduce((sum, p) => sum + Math.max(p.get(id)?.amount ?? 0, 0), 0) / prior.length)
      : null
    return {
      id,
      amount,
      share: total > 0 ? amount / total : 0,
      count: current.get(id)?.count ?? 0,
      avg3,
      delta: avg3 ? (amount - avg3) / avg3 : null,
    }
  })
  return shares
    .filter((s) => s.amount > 0 || (s.avg3 ?? 0) > 0)
    .sort((a, b) => b.amount - a.amount || (b.avg3 ?? 0) - (a.avg3 ?? 0))
}

export function categoryMovers(shares: CategoryShare[], minDiff = 50000, minRatio = 0.3) {
  const diff = (s: CategoryShare) => s.amount - (s.avg3 ?? 0)
  const withBase = shares.filter((s) => s.avg3 !== null && s.delta !== null)
  const up = withBase
    .filter((s) => diff(s) >= minDiff && (s.delta ?? 0) >= minRatio)
    .sort((a, b) => diff(b) - diff(a))
    .slice(0, 3)
  const down = withBase
    .filter((s) => -diff(s) >= minDiff && (s.delta ?? 0) <= -minRatio)
    .sort((a, b) => diff(a) - diff(b))
    .slice(0, 3)
  return { up, down }
}
