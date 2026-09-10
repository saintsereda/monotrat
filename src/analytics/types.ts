export type CategoryId =
  | 'groceries' | 'cafe' | 'taxi' | 'travel' | 'entertainment' | 'cinema' | 'digital'
  | 'health' | 'utilities' | 'mobile' | 'auto' | 'clothes' | 'home' | 'electronics'
  | 'shopping' | 'pets' | 'education' | 'books' | 'taxes' | 'finance' | 'cash'
  | 'transfers' | 'payments' | 'donations' | 'dutyfree' | 'other'

export type AccountKind = 'card' | 'fop' | 'jar'

export interface Account {
  id: string
  kind: AccountKind
  /** mono account type: black, white, platinum, iron, fop, … (absent for jars) */
  type?: string
  title: string
  currencyCode: number
  iban?: string
  /** minor units of the account currency */
  balance: number
}

/** `reversed` = a purchase cancelled by a refund (or the refund that cancelled it) — ignored by all stats */
export type TxKind = 'expense' | 'refund' | 'income' | 'internal' | 'cashbackPayout' | 'reversed'

export interface NormalizedTx {
  id: string
  accountId: string
  accountKind: AccountKind
  /** unix seconds */
  time: number
  description: string
  comment?: string
  mcc: number
  hold: boolean
  /** signed kopecks of UAH, negative = money out */
  amountUah: number
  /** accrued cashback in kopecks of UAH (>= 0) */
  cashbackUah: number
  kind: TxKind
  category: CategoryId
  merchantKey: string
  /** internal transfers only: kind of the other own account, when known */
  counterKind?: AccountKind
}

export interface AnalyticsContext {
  /** unix seconds */
  now: number
  /** selected month, YYYY-MM */
  month: string
  includeTransfers: boolean
  /** month keys that have data loaded (at least partially for the current month) */
  available: ReadonlySet<string>
}
