import { monthEnd, monthStart } from './time'
import type { NormalizedTx } from './types'

/** Positive kopecks for expenses, negative for refunds, 0 otherwise. */
export function spendOf(tx: NormalizedTx): number {
  return tx.kind === 'expense' || tx.kind === 'refund' ? -tx.amountUah : 0
}

export function isSpending(tx: NormalizedTx, includeTransfers: boolean): boolean {
  if (tx.kind !== 'expense' && tx.kind !== 'refund') return false
  return includeTransfers || tx.category !== 'transfers'
}

export function isExpense(tx: NormalizedTx, includeTransfers: boolean): boolean {
  return tx.kind === 'expense' && (includeTransfers || tx.category !== 'transfers')
}

export function between(txs: NormalizedTx[], from: number, to: number): NormalizedTx[] {
  return txs.filter((t) => t.time >= from && t.time < to)
}

export function inMonth(txs: NormalizedTx[], month: string): NormalizedTx[] {
  return between(txs, monthStart(month), monthEnd(month))
}

export function totalSpend(txs: NormalizedTx[], includeTransfers: boolean): number {
  let sum = 0
  for (const t of txs) if (isSpending(t, includeTransfers)) sum += spendOf(t)
  return sum
}

export function totalIncome(txs: NormalizedTx[]): number {
  let sum = 0
  for (const t of txs) if (t.kind === 'income') sum += t.amountUah
  return sum
}
