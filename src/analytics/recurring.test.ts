import { describe, expect, it } from 'vitest'
import { detectRecurring } from './recurring'
import { at, mk } from './test-utils'
import { DAY } from './time'

const NOW = at(2026, 9, 20)
const monthlyOn = (day: number, amount: number, description: string, months: number[], extra = {}) =>
  months.map((m) => mk({ amountUah: amount, time: at(2026, m, day), description, category: 'digital', ...extra }))

describe('detectRecurring', () => {
  it('finds a monthly subscription and predicts the next charge', () => {
    const [item] = detectRecurring(monthlyOn(12, -39900, 'Netflix', [5, 6, 7, 8, 9]), 'expense', NOW)
    expect(item).toMatchObject({ merchantKey: 'netflix', label: 'Netflix', cadence: 'monthly', amount: 39900, count: 5, monthlyCost: 39900, yearlyCost: 478800, priceUp: false, category: 'digital' })
    expect(Math.abs(item.nextTime - at(2026, 10, 12))).toBeLessThanOrEqual(2 * DAY)
  })

  it('flags a price increase', () => {
    const txs = [...monthlyOn(3, -16900, 'Spotify', [5, 6, 7, 8]), mk({ amountUah: -19900, time: at(2026, 9, 3), description: 'Spotify' })]
    const [item] = detectRecurring(txs, 'expense', NOW)
    expect(item).toMatchObject({ cadence: 'monthly', priceUp: true, lastAmount: 19900, amount: 16900 })
  })

  it('finds weekly and yearly payments', () => {
    const weekly = [0, 7, 14, 21].map((d) => mk({ amountUah: -15000, time: at(2026, 8, 25) + d * DAY, description: 'Sport Life' }))
    const yearly = [mk({ amountUah: -120000, time: at(2025, 9, 1), description: 'Namecheap' }), mk({ amountUah: -120000, time: at(2026, 9, 1), description: 'Namecheap' })]
    const items = detectRecurring([...weekly, ...yearly], 'expense', NOW)
    expect(items.map((i) => [i.merchantKey, i.cadence])).toEqual([['sport life', 'weekly'], ['namecheap', 'yearly']])
    expect(items[0].monthlyCost).toBe(65000)
    expect(items[1].monthlyCost).toBe(10000)
  })

  it('ignores irregular merchants and cancelled subscriptions', () => {
    const irregular = [1, 2, 5, 13, 14, 29].map((d, i) => mk({ amountUah: -(10000 + i * 7000), time: at(2026, 8, d), description: 'АТБ' }))
    const cancelled = monthlyOn(10, -29900, 'Megogo', [2, 3, 4, 5])
    expect(detectRecurring([...irregular, ...cancelled], 'expense', NOW)).toEqual([])
  })

  it('detects recurring income', () => {
    const salary = [5, 6, 7, 8, 9].map((m) => mk({ amountUah: 6500000, time: at(2026, m, 5), description: 'ТОВ Софт', kind: 'income', category: 'transfers' }))
    const [item] = detectRecurring(salary, 'income', NOW)
    expect(item).toMatchObject({ kind: 'income', cadence: 'monthly', amount: 6500000 })
  })
})
