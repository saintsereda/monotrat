import { isSpending, spendOf } from './filters'
import { mostFrequent } from './stats'
import { DAY, addMonths, monthEnd, monthStart } from './time'
import type { AnalyticsContext, CategoryId, NormalizedTx } from './types'

export interface MerchantStat {
  key: string
  label: string
  category: CategoryId
  /** net of refunds */
  amount: number
  /** purchases only */
  count: number
  avgCheck: number
  everyDays: number | null
  firstSeen: number
  isNew: boolean
}

/**
 * Same rule as the rest of the dashboard: every transaction that counts as spending (purchases minus
 * refunds) belongs to a merchant, so merchant totals always add up to "витрачено".
 */
export function merchantStats(txs: NormalizedTx[], ctx: AnalyticsContext): MerchantStat[] {
  const start = monthStart(ctx.month)
  const end = monthEnd(ctx.month)
  const history = new Map<string, { first: number; last: number; count: number }>()
  const inMonth = new Map<string, NormalizedTx[]>()

  for (const t of txs) {
    if (!isSpending(t, ctx.includeTransfers)) continue
    if (t.kind === 'expense') {
      const h = history.get(t.merchantKey)
      if (h) {
        h.first = Math.min(h.first, t.time)
        h.last = Math.max(h.last, t.time)
        h.count++
      } else {
        history.set(t.merchantKey, { first: t.time, last: t.time, count: 1 })
      }
    }
    if (t.time >= start && t.time < end) {
      const list = inMonth.get(t.merchantKey)
      if (list) list.push(t)
      else inMonth.set(t.merchantKey, [t])
    }
  }

  const knowsHistory = ctx.available.has(addMonths(ctx.month, -1))
  return [...inMonth]
    .map(([key, list]): MerchantStat => {
      const purchases = list.filter((t) => t.kind === 'expense')
      const h = history.get(key)
      const spentOnPurchases = purchases.reduce((sum, t) => sum - t.amountUah, 0)
      return {
        key,
        label: mostFrequent(list.map((t) => t.description)) ?? key,
        category: mostFrequent(list.map((t) => t.category)) ?? 'other',
        amount: list.reduce((sum, t) => sum + spendOf(t), 0),
        count: purchases.length,
        avgCheck: purchases.length ? Math.round(spentOnPurchases / purchases.length) : 0,
        everyDays: h && h.count >= 3 ? (h.last - h.first) / DAY / (h.count - 1) : null,
        firstSeen: h?.first ?? list[0].time,
        isNew: knowsHistory && h !== undefined && h.first >= start,
      }
    })
    .sort((a, b) => b.amount - a.amount)
}

const positive = (stats: MerchantStat[]) => stats.filter((s) => s.amount > 0)

export function topMerchants(stats: MerchantStat[], by: 'amount' | 'count', n = 10): MerchantStat[] {
  return positive(stats)
    .sort((a, b) => (by === 'count' ? b.count - a.count || b.amount - a.amount : b.amount - a.amount))
    .slice(0, n)
}

export function newMerchants(stats: MerchantStat[]): MerchantStat[] {
  return positive(stats).filter((s) => s.isNew)
}

export interface CategoryTop {
  category: CategoryId
  total: number
  items: MerchantStat[]
}

export function topByCategory(stats: MerchantStat[], perCategory = 5, maxCategories = 6): CategoryTop[] {
  const groups = new Map<CategoryId, MerchantStat[]>()
  for (const s of positive(stats)) {
    const list = groups.get(s.category)
    if (list) list.push(s)
    else groups.set(s.category, [s])
  }
  return [...groups]
    .map(([category, items]) => ({
      category,
      total: items.reduce((sum, s) => sum + s.amount, 0),
      items: [...items].sort((a, b) => b.amount - a.amount).slice(0, perCategory),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, maxCategories)
}
