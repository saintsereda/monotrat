import { between, isExpense, isSpending, spendOf } from './filters'
import { dayKey, daysInMonth, kyivParts, kyivToUnix, monthEnd, monthKey, monthStart, parseMonth } from './time'
import type { AnalyticsContext, NormalizedTx } from './types'

export interface DayCell {
  date: string
  day: number
  weekday: number
  amount: number
  count: number
  isFuture: boolean
}

export function monthDays(txs: NormalizedTx[], ctx: AnalyticsContext): DayCell[] {
  const { year, month } = parseMonth(ctx.month)
  const today = monthKey(ctx.now) === ctx.month ? kyivParts(ctx.now).day : Number.POSITIVE_INFINITY
  const cells: DayCell[] = Array.from({ length: daysInMonth(ctx.month) }, (_, i) => ({
    date: `${ctx.month}-${String(i + 1).padStart(2, '0')}`,
    day: i + 1,
    weekday: kyivParts(kyivToUnix(year, month, i + 1, 12)).weekday,
    amount: 0,
    count: 0,
    isFuture: i + 1 > today,
  }))
  for (const t of between(txs, monthStart(ctx.month), monthEnd(ctx.month))) {
    if (!isSpending(t, ctx.includeTransfers)) continue
    const cell = cells[kyivParts(t.time).day - 1]
    cell.amount += spendOf(t)
    if (isExpense(t, ctx.includeTransfers)) cell.count++
  }
  return cells
}

export interface TopDay {
  date: string
  amount: number
  count: number
  top: { label: string; amount: number }[]
}

export function topDays(txs: NormalizedTx[], ctx: AnalyticsContext, n = 5): TopDay[] {
  const monthTxs = between(txs, monthStart(ctx.month), monthEnd(ctx.month)).filter((t) => isExpense(t, ctx.includeTransfers))
  return monthDays(txs, ctx)
    .filter((d) => d.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, n)
    .map((d) => ({
      date: d.date,
      amount: d.amount,
      count: d.count,
      top: monthTxs
        .filter((t) => dayKey(t.time) === d.date)
        .sort((a, b) => a.amountUah - b.amountUah)
        .slice(0, 3)
        .map((t) => ({ label: t.description, amount: -t.amountUah })),
    }))
}

export interface WeekHour {
  amount: number[][]
  count: number[][]
}

export function weekHourMatrix(txs: NormalizedTx[], ctx: AnalyticsContext): WeekHour {
  const amount = Array.from({ length: 7 }, () => new Array<number>(24).fill(0))
  const count = Array.from({ length: 7 }, () => new Array<number>(24).fill(0))
  for (const t of txs) {
    if (!isExpense(t, ctx.includeTransfers)) continue
    const p = kyivParts(t.time)
    amount[p.weekday][p.hour] -= t.amountUah
    count[p.weekday][p.hour]++
  }
  return { amount, count }
}

const elapsedCells = (txs: NormalizedTx[], ctx: AnalyticsContext) => monthDays(txs, ctx).filter((d) => !d.isFuture)

export function weekdayVsWeekend(txs: NormalizedTx[], ctx: AnalyticsContext) {
  const cells = elapsedCells(txs, ctx)
  const weekday = cells.filter((d) => d.weekday < 5)
  const weekend = cells.filter((d) => d.weekday >= 5)
  const avg = (list: DayCell[]) => (list.length ? Math.round(list.reduce((s, d) => s + d.amount, 0) / list.length) : 0)
  return { weekdayAvg: avg(weekday), weekendAvg: avg(weekend), weekdayDays: weekday.length, weekendDays: weekend.length }
}

export function noSpendDays(txs: NormalizedTx[], ctx: AnalyticsContext) {
  const cells = elapsedCells(txs, ctx)
  let count = 0
  let streak = 0
  let longestStreak = 0
  for (const d of cells) {
    if (d.count === 0) {
      count++
      streak++
      longestStreak = Math.max(longestStreak, streak)
    } else {
      streak = 0
    }
  }
  return { count, longestStreak, elapsedDays: cells.length }
}
