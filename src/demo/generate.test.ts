import { describe, expect, it } from 'vitest'
import { computeDashboard } from '../analytics/dashboard'
import { normalizeAll } from '../analytics/normalize'
import { detectRecurring } from '../analytics/recurring'
import { kyivToUnix, monthKey, recentMonths } from '../analytics/time'
import { DEMO_MONTHS, generateDemo } from './generate'

const NOW = kyivToUnix(2026, 9, 10, 15)

describe('generateDemo', () => {
  it('is deterministic', () => {
    expect(generateDemo(NOW)).toEqual(generateDemo(NOW))
  })

  it('covers 13 months and never goes past now', () => {
    const { transactions } = generateDemo(NOW)
    expect(new Set(transactions.map((t) => monthKey(t.time))).size).toBe(DEMO_MONTHS)
    expect(Math.max(...transactions.map((t) => t.time))).toBeLessThanOrEqual(NOW)
    expect(new Set(transactions.map((t) => t.id)).size).toBe(transactions.length)
  })

  it('produces data the analytics understand', () => {
    const { accounts, transactions } = generateDemo(NOW)
    const txs = normalizeAll(transactions, { accounts, rates: { 980: 1 } })
    expect(txs.some((t) => t.kind === 'internal' && t.counterKind === 'jar')).toBe(true)
    expect(txs.filter((t) => t.kind === 'income').length).toBeGreaterThan(12)
    expect(txs.some((t) => t.kind === 'refund')).toBe(true)
    expect(txs.some((t) => t.kind === 'cashbackPayout')).toBe(true)
    const recurring = detectRecurring(txs, 'expense', NOW).map((r) => r.merchantKey)
    expect(recurring).toEqual(expect.arrayContaining(['netflix', 'spotify', 'київстар', 'олена к']))
  })

  it('feeds a full dashboard', () => {
    const { accounts, transactions } = generateDemo(NOW)
    const txs = normalizeAll(transactions, { accounts, rates: { 980: 1 } })
    const data = computeDashboard(txs, {
      now: NOW, month: monthKey(NOW), includeTransfers: true, available: new Set(recentMonths(NOW, DEMO_MONTHS)),
    })
    expect(data.summary.current.spent).toBeGreaterThan(0)
    expect(data.categories.length).toBeGreaterThan(5)
    expect(data.merchants.length).toBeGreaterThan(5)
    expect(data.forecast.projected).toBeGreaterThanOrEqual(data.forecast.spentSoFar)
    expect(data.cashflow).toHaveLength(DEMO_MONTHS)
    expect(data.insights.length).toBeGreaterThan(3)
  })
})
