import { describe, expect, it } from 'vitest'
import { merchantStats, newMerchants, topByCategory, topMerchants } from './merchants'
import { at, ctx, mk } from './test-utils'
import { kyivToUnix } from './time'

const NOW = kyivToUnix(2026, 9, 16)
const atb = (m: number, d: number) => mk({ amountUah: -10000, time: at(2026, m, d), description: 'АТБ' })
const txs = [
  atb(8, 1), atb(8, 11), atb(8, 21), atb(9, 1), atb(9, 5), atb(9, 9),
  mk({ amountUah: -40000, time: at(2026, 8, 15), description: 'Glovo', category: 'cafe' }),
  mk({ amountUah: -50000, time: at(2026, 9, 10), description: 'Glovo', category: 'cafe' }),
  mk({ amountUah: -20000, time: at(2026, 9, 12), description: 'Lviv Croissants', category: 'cafe' }),
  mk({ amountUah: -1800000, time: at(2026, 9, 1), description: 'Олена К.', category: 'transfers' }),
]
const c = ctx('2026-09', NOW, ['2026-09', '2026-08'], false)

describe('merchants', () => {
  it('aggregates merchant spend for the month, skipping transfers when they are excluded', () => {
    const stats = merchantStats(txs, c)
    expect(stats.map((s) => [s.key, s.amount, s.count, s.isNew])).toEqual([
      ['glovo', 50000, 1, false],
      ['атб', 30000, 3, false],
      ['lviv croissants', 20000, 1, true],
    ])
    const atbStat = stats.find((s) => s.key === 'атб')
    expect(atbStat).toMatchObject({ label: 'АТБ', category: 'groceries', avgCheck: 10000 })
    expect(atbStat?.everyDays).toBeCloseTo(7.8, 5)
    expect(stats.find((s) => s.key === 'glovo')?.everyDays).toBeNull()
  })

  it('includes transfers to people when they count as spending', () => {
    const stats = merchantStats(txs, ctx('2026-09', NOW, ['2026-09', '2026-08'], true))
    expect(stats[0]).toMatchObject({ key: 'олена к.', amount: 1800000, category: 'transfers' })
  })

  it('ranks by amount or count and lists new merchants', () => {
    const stats = merchantStats(txs, c)
    expect(topMerchants(stats, 'count').map((s) => s.key)).toEqual(['атб', 'glovo', 'lviv croissants'])
    expect(newMerchants(stats).map((s) => s.key)).toEqual(['lviv croissants'])
  })

  it('groups top merchants by category', () => {
    const groups = topByCategory(merchantStats(txs, c))
    expect(groups.map((g) => [g.category, g.total, g.items.map((i) => i.key)])).toEqual([
      ['cafe', 70000, ['glovo', 'lviv croissants']],
      ['groceries', 30000, ['атб']],
    ])
  })

  it('does not mark merchants as new without previous-month history', () => {
    expect(newMerchants(merchantStats(txs, ctx('2026-09', NOW, ['2026-09'], false)))).toEqual([])
  })
})
