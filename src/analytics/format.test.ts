import { describe, expect, it } from 'vitest'
import {
  NBSP, dayLabel, formatCompact, formatDelta, formatPercent, formatUah, formatUahExact,
  groupDigits, monthLabel, monthLocative, plural, shortMonth,
} from './format'

describe('format', () => {
  it('groups digits with NBSP', () => {
    expect(groupDigits(11441223583)).toBe(`11${NBSP}441${NBSP}223${NBSP}583`)
    expect(groupDigits(999)).toBe('999')
  })

  it('formats hryvnias from kopecks', () => {
    expect(formatUah(2431840)).toBe(`24${NBSP}318${NBSP}₴`)
    expect(formatUah(-95000)).toBe(`−950${NBSP}₴`)
    expect(formatUahExact(2431840)).toBe(`24${NBSP}318,40${NBSP}₴`)
  })

  it('formats compact hero numbers', () => {
    expect(formatCompact(845000)).toBe(`8${NBSP}450${NBSP}₴`)
    expect(formatCompact(2431800)).toBe(`24,3${NBSP}тис${NBSP}₴`)
    expect(formatCompact(12000000)).toBe(`120${NBSP}тис${NBSP}₴`)
    expect(formatCompact(123456700)).toBe(`1,2${NBSP}млн${NBSP}₴`)
  })

  it('formats percents and deltas', () => {
    expect(formatPercent(0.423)).toBe('42,3%')
    expect(formatPercent(0.05)).toBe('5%')
    expect(formatDelta(0.124)).toBe('+12%')
    expect(formatDelta(-0.08)).toBe('−8%')
    expect(formatDelta(null)).toBe('—')
  })

  it('pluralizes Ukrainian nouns', () => {
    const forms: [string, string, string] = ['операція', 'операції', 'операцій']
    expect(plural(1, forms)).toBe('операція')
    expect(plural(3, forms)).toBe('операції')
    expect(plural(11, forms)).toBe('операцій')
    expect(plural(21, forms)).toBe('операція')
    expect(plural(25, forms)).toBe('операцій')
  })

  it('labels months and days', () => {
    expect(monthLabel('2026-09')).toBe('Вересень 2026')
    expect(monthLocative('2026-09')).toBe('вересні')
    expect(shortMonth('2026-09')).toBe('вер')
    expect(dayLabel('2026-09-10')).toBe('10 вересня')
  })
})
