import { describe, expect, it } from 'vitest'
import { computeDashboard } from './dashboard'
import { isExpense } from './filters'
import { at, ctx, mk } from './test-utils'
import { kyivToUnix } from './time'

const NOW = kyivToUnix(2026, 9, 11)
const txs = [
  mk({ amountUah: -480000, time: at(2026, 9, 6, 10), description: 'Платіж Зелена картка', mcc: 4829, category: 'payments' }),
  mk({ amountUah: -79800, time: at(2026, 9, 6, 14), description: 'PKP Intercity', mcc: 4112, category: 'travel' }),
  mk({ amountUah: -265600, time: at(2026, 9, 7), description: 'APPLEADS/APPLE164', mcc: 5818, category: 'digital' }),
  mk({ amountUah: -1800000, time: at(2026, 9, 1), description: 'Олена К.', mcc: 4829, category: 'transfers' }),
  mk({ amountUah: -10000, time: at(2026, 9, 2), description: 'АТБ' }),
]

describe.each([true, false])('widgets agree on what counts as an expense (includeTransfers=%s)', (includeTransfers) => {
  const data = computeDashboard(txs, ctx('2026-09', NOW, ['2026-09'], includeTransfers))
  const expenses = txs.filter((t) => isExpense(t, includeTransfers))
  const total = expenses.reduce((s, t) => s - t.amountUah, 0)
  const biggest = Math.max(...expenses.map((t) => -t.amountUah))

  it('merchants cover exactly the counted expenses', () => {
    expect(data.merchants.reduce((s, m) => s + m.amount, 0)).toBe(total)
    expect(data.summary.current.spent).toBe(total)
  })

  it('shows the same biggest expense in merchants, biggest purchases and top days', () => {
    expect(data.merchants[0].amount).toBe(biggest)
    expect(-data.biggest[0].amountUah).toBe(biggest)
    expect(Math.max(...data.topDays.flatMap((d) => d.top.map((t) => t.amount)))).toBe(biggest)
  })
})
