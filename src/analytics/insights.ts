import { dailySpend, elapsedDayKeys } from './anomalies'
import { inMonth, isExpense } from './filters'
import { WEEKDAYS, dayLabel, formatPercent, formatUah, monthLocative, plural } from './format'
import type { MerchantStat } from './merchants'
import type { RecurringItem } from './recurring'
import { mean } from './stats'
import { DAY, dayKey, kyivParts, monthKey } from './time'
import type { AnalyticsContext, NormalizedTx } from './types'

export interface Insight {
  id: string
  emoji: string
  title: string
  value: string
  detail: string
}

export interface InsightInput {
  txs: NormalizedTx[]
  ctx: AnalyticsContext
  merchants: MerchantStat[]
  recurring: RecurringItem[]
  biggest: NormalizedTx[]
}

const MONTH_FORMS: [string, string, string] = ['місяць', 'місяці', 'місяців']
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function buildInsights({ txs, ctx, merchants, recurring, biggest }: InsightInput): Insight[] {
  const out: Insight[] = []
  const expenses = inMonth(txs, ctx.month).filter((t) => isExpense(t, ctx.includeTransfers))
  const spent = expenses.reduce((s, t) => s - t.amountUah, 0)

  const big = biggest[0]
  if (big) {
    out.push({ id: 'biggest', emoji: '💸', title: 'Найбільша покупка', value: formatUah(-big.amountUah), detail: `${big.description}, ${dayLabel(dayKey(big.time))}` })
  }

  const recurringTotal = recurring.reduce((s, r) => s + r.monthlyCost, 0)
  if (recurring.length) {
    out.push({
      id: 'recurring', emoji: '🔁', title: 'Регулярні платежі', value: `${formatUah(recurringTotal)} / міс`,
      detail: `${recurring.length} ${plural(recurring.length, ['платіж', 'платежі', 'платежів'])} повторюються`,
    })
  }

  let night = 0
  for (const t of expenses) {
    const hour = kyivParts(t.time).hour
    if (hour >= 22 || hour < 6) night -= t.amountUah
  }
  if (spent > 0 && night / spent >= 0.05) {
    out.push({ id: 'night', emoji: '🌙', title: 'Нічні витрати', value: formatPercent(night / spent), detail: `${formatUah(night)} після 22:00 у ${monthLocative(ctx.month)}` })
  }

  const coffee = expenses.filter((t) => t.mcc === 5814)
  if (coffee.length >= 3) {
    const avg = coffee.reduce((s, t) => s - t.amountUah, 0) / coffee.length
    out.push({ id: 'coffee', emoji: '☕', title: 'Кава й перекуси', value: `${coffee.length} ${plural(coffee.length, ['раз', 'рази', 'разів'])}`, detail: `середній чек ${formatUah(avg)}` })
  }

  const allExpenses = txs.filter((t) => isExpense(t, ctx.includeTransfers))
  const byWeekday = new Array<number>(7).fill(0)
  let historyTotal = 0
  for (const t of allExpenses) {
    byWeekday[kyivParts(t.time).weekday] -= t.amountUah
    historyTotal -= t.amountUah
  }
  if (historyTotal > 0) {
    const top = byWeekday.indexOf(Math.max(...byWeekday))
    out.push({ id: 'weekday', emoji: '📅', title: 'Найвитратніший день тижня', value: capitalize(WEEKDAYS[top]), detail: `${formatPercent(byWeekday[top] / historyTotal)} усіх витрат` })
  }

  const loyalMonths = new Map<string, Set<string>>()
  const loyalLabels = new Map<string, string>()
  for (const t of txs) {
    if (t.kind !== 'expense' || t.category === 'transfers' || t.category === 'cash') continue
    const set = loyalMonths.get(t.merchantKey) ?? new Set<string>()
    set.add(monthKey(t.time))
    loyalMonths.set(t.merchantKey, set)
    loyalLabels.set(t.merchantKey, t.description)
  }
  let loyalKey = ''
  let loyalCount = 0
  for (const [key, months] of loyalMonths) {
    if (months.size > loyalCount) {
      loyalKey = key
      loyalCount = months.size
    }
  }
  if (loyalCount >= 3) {
    out.push({ id: 'loyal', emoji: '❤️', title: 'Найвірніший мерчант', value: loyalLabels.get(loyalKey) ?? loyalKey, detail: `купуєте тут ${loyalCount} ${plural(loyalCount, MONTH_FORMS)} з ${ctx.available.size}` })
  }

  const fresh = merchants.filter((m) => m.isNew)
  if (fresh.length >= 3) {
    out.push({ id: 'new', emoji: '🧭', title: 'Нові місця', value: String(fresh.length), detail: `уперше цього місяця: ${fresh.slice(0, 3).map((m) => m.label).join(', ')}` })
  }

  const cashback = txs.reduce((s, t) => s + t.cashbackUah, 0)
  if (cashback > 0 && ctx.available.size > 0) {
    out.push({ id: 'cashback', emoji: '🎁', title: 'Кешбек за весь період', value: formatUah(cashback), detail: `за ${ctx.available.size} ${plural(ctx.available.size, MONTH_FORMS)}` })
  }

  const payday = paydayEffect(txs, ctx)
  if (payday !== null && payday >= 1.2) {
    out.push({ id: 'payday', emoji: '🎉', title: 'Після зарплати', value: `+${Math.round((payday - 1) * 100)}%`, detail: 'витрачаєте більше за тиждень після найбільшого надходження' })
  }

  return out
}

/** Ratio of average daily spend in the 7 days after each month's biggest income vs other days. */
function paydayEffect(txs: NormalizedTx[], ctx: AnalyticsContext): number | null {
  const biggestIncome = new Map<string, NormalizedTx>()
  for (const t of txs) {
    if (t.kind !== 'income') continue
    const month = monthKey(t.time)
    const current = biggestIncome.get(month)
    if (!current || t.amountUah > current.amountUah) biggestIncome.set(month, t)
  }
  if (biggestIncome.size < 2) return null
  const window = new Set<string>()
  for (const t of biggestIncome.values()) for (let i = 0; i < 7; i++) window.add(dayKey(t.time + i * DAY))

  const totals = dailySpend(txs, false)
  const inside: number[] = []
  const outside: number[] = []
  for (const key of elapsedDayKeys(ctx)) (window.has(key) ? inside : outside).push(totals.get(key) ?? 0)
  const base = mean(outside)
  return inside.length && base > 0 ? mean(inside) / base : null
}
