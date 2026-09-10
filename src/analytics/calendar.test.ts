import { describe, expect, it } from 'vitest'
import { monthDays, noSpendDays, topDays, weekHourMatrix, weekdayVsWeekend } from './calendar'
import { at, ctx, mk } from './test-utils'

const NOW = at(2026, 9, 10, 23) // Thursday 10 Sep, 23:00
const txs = [
  mk({ amountUah: -10000, time: at(2026, 9, 1) }), // Tue
  mk({ amountUah: -50000, time: at(2026, 9, 5, 20), description: 'Glovo' }), // Sat
  mk({ amountUah: -30000, time: at(2026, 9, 5, 21), description: 'Uklon' }), // Sat
  mk({ amountUah: -20000, time: at(2026, 9, 6) }), // Sun
  mk({ amountUah: -40000, time: at(2026, 9, 9) }), // Wed
]
const c = ctx('2026-09', NOW, ['2026-09'])

describe('calendar', () => {
  it('builds one cell per day with amounts, weekday and future flag', () => {
    const days = monthDays(txs, c)
    expect(days).toHaveLength(30)
    expect(days[0]).toMatchObject({ date: '2026-09-01', day: 1, weekday: 1, amount: 10000, count: 1, isFuture: false })
    expect(days[4]).toMatchObject({ date: '2026-09-05', weekday: 5, amount: 80000, count: 2 })
    expect(days[9].isFuture).toBe(false)
    expect(days[10].isFuture).toBe(true)
  })

  it('ranks the most expensive days with their biggest purchases', () => {
    expect(topDays(txs, c, 2)).toEqual([
      { date: '2026-09-05', amount: 80000, count: 2, top: [{ label: 'Glovo', amount: 50000 }, { label: 'Uklon', amount: 30000 }] },
      { date: '2026-09-09', amount: 40000, count: 1, top: [{ label: 'АТБ', amount: 40000 }] },
    ])
  })

  it('builds a weekday × hour matrix', () => {
    const m = weekHourMatrix(txs, c)
    expect(m.amount[5][20]).toBe(50000)
    expect(m.amount[5][21]).toBe(30000)
    expect(m.count[5][20]).toBe(1)
    expect(m.amount[1][12]).toBe(10000)
  })

  it('compares weekdays with weekends', () => {
    expect(weekdayVsWeekend(txs, c)).toEqual({ weekdayAvg: 6250, weekendAvg: 50000, weekdayDays: 8, weekendDays: 2 })
  })

  it('counts no-spend days and the longest streak', () => {
    expect(noSpendDays(txs, c)).toEqual({ count: 6, longestStreak: 3, elapsedDays: 10 })
  })
})
