import { kyivToUnix } from './time'
import type { AnalyticsContext, NormalizedTx } from './types'

let seq = 0

/** Unix seconds for a Kyiv wall-clock time. */
export const at = (y: number, m: number, d: number, h = 12) => kyivToUnix(y, m, d, h)

export function mk(p: Partial<NormalizedTx> & { amountUah: number; time: number }): NormalizedTx {
  const description = p.description ?? 'АТБ'
  return {
    id: `x${++seq}`,
    accountId: 'black',
    accountKind: 'card',
    description,
    mcc: 5411,
    hold: false,
    cashbackUah: 0,
    kind: p.amountUah < 0 ? 'expense' : 'income',
    category: 'groceries',
    merchantKey: description.toLowerCase(),
    ...p,
  }
}

export const ctx = (month: string, now: number, available: string[], includeTransfers = true): AnalyticsContext => ({
  month, now, includeTransfers, available: new Set(available),
})
