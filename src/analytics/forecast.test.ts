import { describe, expect, it } from 'vitest'
import { forecastMonth } from './forecast'
import type { RecurringItem } from './recurring'
import { at, ctx, mk } from './test-utils'
import { DAY, kyivToUnix } from './time'

const NOW = kyivToUnix(2026, 9, 11) // 10 days elapsed, 20 left
const daily = (year: number, month: number, days: number, amount: number) =>
  Array.from({ length: days }, (_, i) => mk({ amountUah: -amount, time: at(year, month, i + 1), description: 'АТБ' }))

const txs = [
  ...daily(2026, 7, 31, 20000),
  ...daily(2026, 8, 31, 20000),
  ...daily(2026, 9, 10, 10000),
  mk({ amountUah: 6000000, time: at(2026, 7, 5), kind: 'income', category: 'transfers' }),
  mk({ amountUah: 4000000, time: at(2026, 8, 5), kind: 'income', category: 'transfers' }),
]

const recurring = (p: Partial<RecurringItem>): RecurringItem => ({
  merchantKey: 'netflix', label: 'Netflix', category: 'digital', kind: 'expense', amount: 39900, lastAmount: 39900,
  cadence: 'monthly', intervalDays: 30, count: 4, lastTime: at(2026, 8, 15), nextTime: at(2026, 9, 15),
  monthlyCost: 39900, yearlyCost: 478800, priceUp: false, ...p,
})
const salary = recurring({ merchantKey: 'тов софт', label: 'ТОВ Софт', kind: 'income', amount: 5000000, nextTime: at(2026, 9, 25) })

describe('forecastMonth', () => {
  it('blends month-to-date pace with history and adds pending recurring payments', () => {
    const f = forecastMonth(txs, ctx('2026-09', NOW, ['2026-09', '2026-08', '2026-07']), [recurring({})], [salary])
    expect(f).toMatchObject({
      isCurrent: true, spentSoFar: 100000, recurringPending: 39900, dailyRate: 15000, daysLeft: 20,
      projected: 439900, low: 439900, high: 439900,
      incomeSoFar: 0, incomePending: 5000000, incomeProjected: 5000000, avgIncome3: 5000000,
    })
  })

  it('uses only the month-to-date pace without history', () => {
    const f = forecastMonth(txs, ctx('2026-09', NOW, ['2026-09']), [recurring({})], [])
    expect(f).toMatchObject({ dailyRate: 10000, projected: 339900, avgIncome3: null })
  })

  it('does not count a recurring payment already charged this month', () => {
    const f = forecastMonth(txs, ctx('2026-09', NOW, ['2026-09']), [recurring({ lastTime: at(2026, 9, 2), nextTime: at(2026, 9, 2) + 30 * DAY })], [])
    expect(f.recurringPending).toBe(0)
  })

  it('returns actuals for past months', () => {
    const f = forecastMonth(txs, ctx('2026-08', NOW, ['2026-09', '2026-08', '2026-07']), [], [])
    expect(f).toMatchObject({ isCurrent: false, spentSoFar: 620000, projected: 620000, low: 620000, high: 620000, daysLeft: 0, incomeSoFar: 4000000, incomeProjected: 4000000 })
  })
})
