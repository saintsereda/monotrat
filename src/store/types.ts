import type { Account } from '../analytics/types'
import type { StoredTx } from '../api/types'

export type CoverageStatus = 'complete' | 'partial' | 'failed'

export interface CoverageEntry {
  key: string
  accountId: string
  month: string
  status: CoverageStatus
  /** unix seconds, inclusive upper bound of what has been fetched */
  fetchedUntil: number
}

export const coverageKey = (accountId: string, month: string) => `${accountId}:${month}`

export interface Store {
  /** upsert by id */
  putTransactions(txs: StoredTx[]): Promise<void>
  getAllTransactions(): Promise<StoredTx[]>
  /** replaces the whole account list */
  putAccounts(accounts: Account[]): Promise<void>
  getAccounts(): Promise<Account[]>
  putCoverage(entry: CoverageEntry): Promise<void>
  getCoverage(): Promise<CoverageEntry[]>
  getMeta<T>(key: string): Promise<T | undefined>
  setMeta(key: string, value: unknown): Promise<void>
  clear(): Promise<void>
  close(): void
}
