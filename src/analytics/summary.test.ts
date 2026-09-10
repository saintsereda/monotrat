import { describe, expect, it } from 'vitest'
import { monthSummary, summaryWithDelta } from './summary'
import { at, ctx, mk } from './test-utils'

const sep = [
  mk({ amountUah: -100000, time: at(2026, 9, 2), cashbackUah: 1000 }),
  mk({ amountUah: -50000, time: at(2026, 9, 3), category: 'cafe', description: 'Aroma Kava' }),
  mk({ amountUah: 20000, time: at(2026, 9, 4), kind: 'refund', category: 'clothes' }),
  mk({ amountUah: 5000000, time: at(2026, 9, 5), kind: 'income', category: 'transfers' }),
  mk({ amountUah: -300000, time: at(2026, 9, 6), kind: 'internal', counterKind: 'jar' }),
  mk({ amountUah: 300000, time: at(2026, 9, 6), kind: 'internal', accountKind: 'jar', accountId: 'jar', counterKind: 'card' }),
  mk({ amountUah: -200000, time: at(2026, 9, 7), category: 'transfers', description: 'Олена К.' }),
]
const aug = [
  mk({ amountUah: -100000, time: at(2026, 8, 5) }),
  mk({ amountUah: -400000, time: at(2026, 8, 20) }),
]

describe('monthSummary', () => {
  it('sums spending, income, cashback and savings', () => {
    expect(monthSummary(sep, '2026-09', true)).toEqual({
      month: '2026-09', spent: 330000, income: 5000000, cashback: 1000, saved: 300000,
      net: 4670000, count: 3, avgCheck: 116667,
    })
  })

  it('can exclude transfers to people', () => {
    expect(monthSummary(sep, '2026-09', false)).toMatchObject({ spent: 130000, count: 2, avgCheck: 75000 })
  })
})

describe('summaryWithDelta', () => {
  it('compares the current month with the same day of the previous month', () => {
    const r = summaryWithDelta([...aug, ...sep], ctx('2026-09', at(2026, 9, 10), ['2026-09', '2026-08']))
    expect(r.comparedToSameDay).toBe(true)
    expect(r.previous?.spent).toBe(100000)
    expect(r.deltas.spent).toBeCloseTo(2.3)
    expect(r.deltas.income).toBeNull()
  })

  it('compares full months for past months', () => {
    const r = summaryWithDelta([...aug, ...sep], ctx('2026-09', at(2026, 10, 15), ['2026-09', '2026-08']))
    expect(r.comparedToSameDay).toBe(false)
    expect(r.previous?.spent).toBe(500000)
  })

  it('has no previous summary when the previous month is not loaded', () => {
    const r = summaryWithDelta(sep, ctx('2026-09', at(2026, 9, 10), ['2026-09']))
    expect(r.previous).toBeNull()
    expect(r.deltas.spent).toBeNull()
  })
})
