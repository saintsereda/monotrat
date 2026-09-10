import { describe, expect, it } from 'vitest'
import {
  addMonths, dayKey, daysInMonth, kyivParts, kyivToUnix, monthEnd, monthKey, monthStart, recentMonths,
} from './time'

const utc = (y: number, m: number, d: number, h = 0, min = 0) => Date.UTC(y, m - 1, d, h, min) / 1000

describe('time (Europe/Kyiv)', () => {
  it('converts Kyiv midnight to unix in winter (UTC+2) and summer (UTC+3)', () => {
    expect(kyivToUnix(2026, 1, 1)).toBe(utc(2025, 12, 31, 22))
    expect(kyivToUnix(2026, 7, 1)).toBe(utc(2026, 6, 30, 21))
  })

  it('computes month and day keys in Kyiv time', () => {
    // 2026-08-31 22:30 UTC is 2026-09-01 01:30 in Kyiv
    expect(monthKey(utc(2026, 8, 31, 22, 30))).toBe('2026-09')
    expect(dayKey(utc(2026, 8, 31, 22, 30))).toBe('2026-09-01')
  })

  it('returns Monday-based weekday and hour', () => {
    const p = kyivParts(utc(2026, 9, 10, 9)) // Thursday, 12:00 Kyiv
    expect(p.weekday).toBe(3)
    expect(p.hour).toBe(12)
  })

  it('adds months across year boundaries', () => {
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(addMonths('2025-12', 1)).toBe('2026-01')
    expect(addMonths('2026-09', -12)).toBe('2025-09')
  })

  it('handles DST in month bounds (March 2026 is 31 days minus 1 hour)', () => {
    expect(monthEnd('2026-03') - monthStart('2026-03')).toBe(31 * 86400 - 3600)
  })

  it('counts days in month', () => {
    expect(daysInMonth('2024-02')).toBe(29)
    expect(daysInMonth('2026-09')).toBe(30)
  })

  it('lists recent months, current first', () => {
    expect(recentMonths(utc(2026, 9, 10, 12), 3)).toEqual(['2026-09', '2026-08', '2026-07'])
  })
})
