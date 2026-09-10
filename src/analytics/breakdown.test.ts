import { describe, expect, it } from 'vitest'
import { categoryBreakdown, categoryMovers } from './breakdown'
import { at, ctx, mk } from './test-utils'
import { kyivToUnix } from './time'

const NOW = kyivToUnix(2026, 9, 16) // 15 days elapsed
const txs = [
  mk({ amountUah: -100000, time: at(2026, 9, 2) }),
  mk({ amountUah: 10000, time: at(2026, 9, 3), kind: 'refund' }),
  mk({ amountUah: -150000, time: at(2026, 9, 4), category: 'cafe', description: 'Glovo' }),
  mk({ amountUah: -60000, time: at(2026, 8, 5) }),
  mk({ amountUah: -10000, time: at(2026, 8, 10), category: 'cafe', description: 'Glovo' }),
  mk({ amountUah: -80000, time: at(2026, 8, 3), category: 'taxi', description: 'Uklon' }),
  mk({ amountUah: -500000, time: at(2026, 8, 25) }),
]

describe('categoryBreakdown', () => {
  it('computes shares and compares with previous months at the same elapsed time', () => {
    const shares = categoryBreakdown(txs, ctx('2026-09', NOW, ['2026-09', '2026-08']))
    expect(shares).toEqual([
      { id: 'cafe', amount: 150000, share: 0.625, count: 1, avg3: 10000, delta: 14 },
      { id: 'groceries', amount: 90000, share: 0.375, count: 1, avg3: 60000, delta: 0.5 },
      { id: 'taxi', amount: 0, share: 0, count: 0, avg3: 80000, delta: -1 },
    ])
  })

  it('uses full months for past months and null baselines without history', () => {
    const shares = categoryBreakdown(txs, ctx('2026-08', NOW, ['2026-09', '2026-08']))
    expect(shares.map((s) => [s.id, s.amount, s.avg3])).toEqual([['groceries', 560000, null], ['taxi', 80000, null], ['cafe', 10000, null]])
  })
})

describe('categoryMovers', () => {
  it('picks categories that grew or shrank by at least 500 ₴ and 30%', () => {
    const { up, down } = categoryMovers(categoryBreakdown(txs, ctx('2026-09', NOW, ['2026-09', '2026-08'])))
    expect(up.map((s) => s.id)).toEqual(['cafe'])
    expect(down.map((s) => s.id)).toEqual(['taxi'])
  })
})
