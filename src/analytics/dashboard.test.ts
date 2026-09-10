import { describe, expect, it } from 'vitest'
import type { StoredTx } from '../api/types'
import { computeDashboard } from './dashboard'
import { isExpense, isSpending, spendOf } from './filters'
import { normalizeAll } from './normalize'
import { at, ctx, mk } from './test-utils'
import { kyivToUnix } from './time'

const NOW = kyivToUnix(2026, 9, 11)
const txs = [
  mk({ amountUah: -480000, time: at(2026, 9, 6, 10), description: 'Платіж Зелена картка', mcc: 4829, category: 'payments' }),
  mk({ amountUah: -79800, time: at(2026, 9, 6, 14), description: 'PKP Intercity', mcc: 4112, category: 'travel' }),
  mk({ amountUah: 20000, time: at(2026, 9, 8), description: 'PKP Intercity', mcc: 4112, category: 'travel', kind: 'refund' }),
  mk({ amountUah: -265600, time: at(2026, 9, 7), description: 'APPLEADS/APPLE164', mcc: 5818, category: 'digital' }),
  mk({ amountUah: -1800000, time: at(2026, 9, 1), description: 'Олена К.', mcc: 4829, category: 'transfers' }),
  mk({ amountUah: -10000, time: at(2026, 9, 2), description: 'АТБ' }),
]

describe.each([true, false])('widgets agree on what counts as spending (includeTransfers=%s)', (includeTransfers) => {
  const data = computeDashboard(txs, ctx('2026-09', NOW, ['2026-09'], includeTransfers))
  const total = txs.filter((t) => isSpending(t, includeTransfers)).reduce((s, t) => s + spendOf(t), 0)
  const biggest = Math.max(...txs.filter((t) => isExpense(t, includeTransfers)).map((t) => -t.amountUah))

  it('merchants add up to the spent total (refunds included)', () => {
    expect(data.merchants.reduce((s, m) => s + m.amount, 0)).toBe(total)
    expect(data.summary.current.spent).toBe(total)
    expect(data.merchants.find((m) => m.key === 'pkp intercity')).toMatchObject({ amount: 59800, count: 1 })
  })

  it('shows the same biggest expense in merchants, biggest purchases and top days', () => {
    expect(data.merchants[0].amount).toBe(biggest)
    expect(-data.biggest[0].amountUah).toBe(biggest)
    expect(Math.max(...data.topDays.flatMap((d) => d.top.map((t) => t.amount)))).toBe(biggest)
  })
})

const stored = (amount: number, description: string, mcc: number, time: number): StoredTx => ({
  id: `${description}-${time}`, accountId: 'black', time, description, mcc, hold: false, amount, operationAmount: amount,
  currencyCode: 980, commissionRate: 0, cashbackAmount: 0, balance: 0,
})

describe('refunded purchases', () => {
  it('disappear from every widget once fully refunded', () => {
    const normalized = normalizeAll([
      stored(-300000, 'Booking.com', 4722, at(2026, 9, 3)),
      stored(300000, 'Booking.com', 4722, at(2026, 9, 4)),
      stored(-10000, 'АТБ', 5411, at(2026, 9, 2)),
    ], { accounts: [{ id: 'black', kind: 'card', title: 'Чорна картка', currencyCode: 980, balance: 0 }], rates: { 980: 1 } })
    const data = computeDashboard(normalized, ctx('2026-09', NOW, ['2026-09']))
    expect(data.summary.current.spent).toBe(10000)
    expect(data.merchants.map((m) => m.key)).toEqual(['атб'])
    expect(data.biggest.map((t) => t.description)).toEqual(['АТБ'])
    expect(data.topDays.map((d) => d.date)).toEqual(['2026-09-02'])
    expect(data.categories.map((c) => c.id)).toEqual(['groceries'])
  })
})
