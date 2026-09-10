import { describe, expect, it } from 'vitest'
import { CATEGORIES, NON_MERCHANT_CATEGORIES, TRANSFER_MCCS, categoryForMcc } from './categories'
import type { CategoryId } from './types'

describe('categoryForMcc', () => {
  const cases: Array<[number, CategoryId]> = [
    [5411, 'groceries'], [5814, 'cafe'], [4121, 'taxi'], [3015, 'travel'], [4111, 'travel'],
    [4829, 'transfers'], [6538, 'transfers'], [6011, 'cash'], [5815, 'digital'], [8398, 'donations'],
    [742, 'pets'], [9311, 'taxes'], [5655, 'clothes'], [7542, 'auto'], [5912, 'health'],
    [4814, 'mobile'], [5732, 'electronics'], [5200, 'home'], [7832, 'cinema'], [1, 'other'],
  ]
  it.each(cases)('maps %i to %s', (mcc, expected) => {
    expect(categoryForMcc(mcc)).toBe(expected)
  })

  it('has consistent metadata for every category', () => {
    for (const [id, meta] of Object.entries(CATEGORIES)) {
      expect(meta.id).toBe(id)
      expect(meta.label.length).toBeGreaterThan(0)
      expect(meta.color).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('exposes transfer MCCs and non-merchant categories', () => {
    expect(TRANSFER_MCCS.has(4829)).toBe(true)
    expect(NON_MERCHANT_CATEGORIES.has('transfers')).toBe(true)
    expect(NON_MERCHANT_CATEGORIES.has('groceries')).toBe(false)
  })
})
