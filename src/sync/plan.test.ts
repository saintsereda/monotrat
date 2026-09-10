import { describe, expect, it } from 'vitest'
import { DAY, monthEnd, monthStart } from '../analytics/time'
import type { Account } from '../analytics/types'
import { buildQueue } from './plan'

const NOW = Date.UTC(2026, 8, 10, 9) / 1000 // 2026-09-10 12:00 Kyiv
const acc = (id: string, kind: Account['kind'], extra: Partial<Account> = {}): Account => ({
  id, kind, title: id, currencyCode: 980, balance: 0, ...extra,
})
const accounts = [acc('jar', 'jar'), acc('fop', 'fop'), acc('black', 'card', { type: 'black' }), acc('white', 'card', { type: 'white' })]

describe('buildQueue', () => {
  it('loads all months of cards and FOP first, jars last', () => {
    const q = buildQueue(accounts, [], NOW, 2)
    expect(q.map((j) => `${j.month}:${j.accountId}`)).toEqual([
      '2026-09:black', '2026-09:white', '2026-09:fop',
      '2026-08:black', '2026-08:white', '2026-08:fop',
      '2026-09:jar', '2026-08:jar',
    ])
    expect(q[0]).toEqual({ accountId: 'black', month: '2026-09', from: monthStart('2026-09'), to: NOW, closesMonth: false })
    expect(q[3]).toEqual({ accountId: 'black', month: '2026-08', from: monthStart('2026-08'), to: monthEnd('2026-08') - 1, closesMonth: true })
  })

  it('puts the hryvnia black card first and foreign-currency cards last', () => {
    const q = buildQueue([
      acc('usd', 'card', { type: 'black', currencyCode: 840 }),
      acc('white', 'card', { type: 'white' }),
      acc('black', 'card', { type: 'black' }),
    ], [], NOW, 1)
    expect(q.map((j) => j.accountId)).toEqual(['black', 'white', 'usd'])
  })

  it('skips complete windows and resumes partial ones with overlap', () => {
    const fetchedUntil = NOW - 5 * DAY
    const q = buildQueue([acc('black', 'card')], [
      { key: 'black:2026-08', accountId: 'black', month: '2026-08', status: 'complete', fetchedUntil: 0 },
      { key: 'black:2026-09', accountId: 'black', month: '2026-09', status: 'partial', fetchedUntil },
      { key: 'black:2026-07', accountId: 'black', month: '2026-07', status: 'failed', fetchedUntil: 0 },
    ], NOW, 3)
    expect(q.map((j) => j.month)).toEqual(['2026-09', '2026-07'])
    expect(q[0].from).toBe(fetchedUntil - 3 * DAY)
    expect(q[1].from).toBe(monthStart('2026-07'))
  })

  it('keeps every window within the 31 days + 1 hour API limit', () => {
    for (const job of buildQueue([acc('black', 'card')], [], NOW)) {
      expect(job.to - job.from).toBeLessThanOrEqual(2_682_000)
    }
  })
})
