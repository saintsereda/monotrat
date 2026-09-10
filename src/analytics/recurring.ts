import { mean, median, mostFrequent, std } from './stats'
import { DAY } from './time'
import type { CategoryId, NormalizedTx } from './types'

export type Cadence = 'weekly' | 'monthly' | 'yearly'

export interface RecurringItem {
  merchantKey: string
  label: string
  category: CategoryId
  kind: 'expense' | 'income'
  /** median absolute amount, kopecks */
  amount: number
  lastAmount: number
  cadence: Cadence
  intervalDays: number
  count: number
  lastTime: number
  nextTime: number
  monthlyCost: number
  yearlyCost: number
  priceUp: boolean
}

const CADENCES: ReadonlyArray<{ cadence: Cadence; days: number; tolerance: number; minCount: number; perMonth: number }> = [
  { cadence: 'weekly', days: 7, tolerance: 2, minCount: 3, perMonth: 52 / 12 },
  { cadence: 'monthly', days: 30, tolerance: 4, minCount: 3, perMonth: 1 },
  { cadence: 'yearly', days: 365, tolerance: 15, minCount: 2, perMonth: 1 / 12 },
]
const AMOUNT_TOLERANCE = 0.25
const MAX_INTERVAL_CV = 0.25

export function detectRecurring(txs: NormalizedTx[], kind: 'expense' | 'income', now: number): RecurringItem[] {
  const groups = new Map<string, NormalizedTx[]>()
  for (const t of txs) {
    if (t.kind !== kind) continue
    const list = groups.get(t.merchantKey)
    if (list) list.push(t)
    else groups.set(t.merchantKey, [t])
  }

  const items: RecurringItem[] = []
  for (const [merchantKey, group] of groups) {
    if (group.length < 2) continue
    const typical = median(group.map((t) => Math.abs(t.amountUah)))
    const kept = group
      .filter((t) => Math.abs(Math.abs(t.amountUah) - typical) <= typical * AMOUNT_TOLERANCE)
      .sort((a, b) => a.time - b.time)
    if (kept.length < 2) continue

    const intervals = kept.slice(1).map((t, i) => (t.time - kept[i].time) / DAY)
    const intervalDays = median(intervals)
    const spec = CADENCES.find((c) => Math.abs(intervalDays - c.days) <= c.tolerance)
    if (!spec || kept.length < spec.minCount) continue
    const avg = mean(intervals)
    if (avg <= 0 || std(intervals) / avg >= MAX_INTERVAL_CV) continue

    const lastTx = kept[kept.length - 1]
    if (now - lastTx.time > (intervalDays * 1.5 + spec.tolerance) * DAY) continue

    const amount = Math.round(median(kept.map((t) => Math.abs(t.amountUah))))
    const lastAmount = Math.abs(lastTx.amountUah)
    const prevAmount = Math.abs(kept[kept.length - 2].amountUah)
    const monthlyCost = Math.round(amount * spec.perMonth)
    items.push({
      merchantKey,
      label: mostFrequent(group.map((t) => t.description)) ?? merchantKey,
      category: lastTx.category,
      kind,
      amount,
      lastAmount,
      cadence: spec.cadence,
      intervalDays,
      count: kept.length,
      lastTime: lastTx.time,
      nextTime: lastTx.time + Math.round(intervalDays * DAY),
      monthlyCost,
      yearlyCost: monthlyCost * 12,
      priceUp: lastAmount > prevAmount * 1.05,
    })
  }
  return items.sort((a, b) => b.monthlyCost - a.monthlyCost)
}
