import { describe, expect, it } from 'vitest'
import { cashflow, compareMonth, cumulativeSpend } from './compare'
import { at, ctx, mk } from './test-utils'

const txs = [
  mk({ amountUah: -30000, time: at(2026, 7, 1) }),
  mk({ amountUah: -50000, time: at(2026, 8, 2) }),
  mk({ amountUah: -50000, time: at(2026, 8, 25) }),
  mk({ amountUah: 900000, time: at(2026, 8, 5), kind: 'income', category: 'transfers' }),
  mk({ amountUah: -10000, time: at(2026, 9, 1) }),
  mk({ amountUah: -20000, time: at(2026, 9, 3) }),
]
const available = ['2026-09', '2026-08', '2026-07']

describe('cumulativeSpend', () => {
  it('accumulates daily spend and truncates at `until`', () => {
    expect(cumulativeSpend(txs, '2026-09', true, at(2026, 9, 3, 20))).toEqual([10000, 10000, 30000])
    expect(cumulativeSpend(txs, '2026-08', true)).toHaveLength(31)
  })
})

describe('compareMonth', () => {
  it('compares against previous month, 3-month average and last year', () => {
    const r = compareMonth(txs, ctx('2026-09', at(2026, 9, 10), available))
    expect(r).toMatchObject({
      isCurrent: true, elapsedDays: 10, days: 30, spentToDate: 30000,
      prevToSameDay: 50000, prevTotal: 100000,
      avg3ToSameDay: 40000, avg3Total: 65000,
      lastYearToSameDay: null, lastYearTotal: null,
    })
    expect(r.series.current).toHaveLength(10)
    expect(r.series.avg3).toHaveLength(30)
    expect(r.series.previous).toHaveLength(31)
  })
})

describe('cashflow', () => {
  it('returns income, spend and net per available month, oldest first', () => {
    expect(cashflow(txs, ctx('2026-09', at(2026, 9, 10), available))).toEqual([
      { month: '2026-07', income: 0, spent: 30000, net: -30000 },
      { month: '2026-08', income: 900000, spent: 100000, net: 800000 },
      { month: '2026-09', income: 0, spent: 30000, net: -30000 },
    ])
  })
})
