import {
  type CategorySpike, type UnusualDay, type UnusualTx,
  biggestPurchases, categorySpikes, unusualDays, unusualTransactions,
} from './anomalies'
import { type CategoryShare, categoryBreakdown, categoryMovers } from './breakdown'
import { type DayCell, type TopDay, type WeekHour, monthDays, noSpendDays, topDays, weekHourMatrix, weekdayVsWeekend } from './calendar'
import { type CashflowPoint, type MonthComparison, cashflow, compareMonth } from './compare'
import { type Forecast, forecastMonth } from './forecast'
import { type Insight, buildInsights } from './insights'
import { type CategoryTop, type MerchantStat, merchantStats, newMerchants, topByCategory } from './merchants'
import { type RecurringItem, detectRecurring } from './recurring'
import { type SummaryWithDelta, summaryWithDelta } from './summary'
import type { AnalyticsContext, NormalizedTx } from './types'

export interface DashboardData {
  summary: SummaryWithDelta
  comparison: MonthComparison
  forecast: Forecast
  cashflow: CashflowPoint[]
  categories: CategoryShare[]
  movers: { up: CategoryShare[]; down: CategoryShare[] }
  spikes: CategorySpike[]
  merchants: MerchantStat[]
  newMerchants: MerchantStat[]
  byCategory: CategoryTop[]
  days: DayCell[]
  topDays: TopDay[]
  weekHour: WeekHour
  weekdayWeekend: ReturnType<typeof weekdayVsWeekend>
  noSpend: ReturnType<typeof noSpendDays>
  recurring: RecurringItem[]
  recurringIncome: RecurringItem[]
  unusualTxs: UnusualTx[]
  unusualDays: UnusualDay[]
  biggest: NormalizedTx[]
  insights: Insight[]
}

export function computeDashboard(txs: NormalizedTx[], ctx: AnalyticsContext): DashboardData {
  const recurring = detectRecurring(txs, 'expense', ctx.now)
  const recurringIncome = detectRecurring(txs, 'income', ctx.now)
  const categories = categoryBreakdown(txs, ctx)
  const merchants = merchantStats(txs, ctx)
  const biggest = biggestPurchases(txs, ctx)
  return {
    summary: summaryWithDelta(txs, ctx),
    comparison: compareMonth(txs, ctx),
    forecast: forecastMonth(txs, ctx, recurring, recurringIncome),
    cashflow: cashflow(txs, ctx),
    categories,
    movers: categoryMovers(categories),
    spikes: categorySpikes(categories, ctx),
    merchants,
    newMerchants: newMerchants(merchants),
    byCategory: topByCategory(merchants),
    days: monthDays(txs, ctx),
    topDays: topDays(txs, ctx),
    weekHour: weekHourMatrix(txs, ctx),
    weekdayWeekend: weekdayVsWeekend(txs, ctx),
    noSpend: noSpendDays(txs, ctx),
    recurring,
    recurringIncome,
    unusualTxs: unusualTransactions(txs, ctx),
    unusualDays: unusualDays(txs, ctx),
    biggest,
    insights: buildInsights({ txs, ctx, merchants, recurring, biggest }),
  }
}
