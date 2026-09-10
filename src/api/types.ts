export interface MonoAccount {
  id: string
  sendId?: string
  balance: number
  creditLimit?: number
  type: string
  currencyCode: number
  cashbackType?: string
  maskedPan?: string[]
  iban?: string
}

export interface MonoJar {
  id: string
  sendId?: string
  title: string
  description?: string
  currencyCode: number
  balance: number
  goal?: number
}

export interface MonoClientInfo {
  clientId: string
  name: string
  webHookUrl?: string
  permissions?: string
  accounts: MonoAccount[]
  jars?: MonoJar[]
}

export interface MonoStatementItem {
  id: string
  time: number
  description: string
  mcc: number
  originalMcc?: number
  hold: boolean
  /** minor units of the account currency, signed */
  amount: number
  operationAmount: number
  /** account currency, ISO 4217 numeric */
  currencyCode: number
  commissionRate: number
  cashbackAmount: number
  balance: number
  comment?: string
  receiptId?: string
  invoiceId?: string
  counterEdrpou?: string
  counterIban?: string
  counterName?: string
}

export interface MonoCurrencyRate {
  currencyCodeA: number
  currencyCodeB: number
  date: number
  rateBuy?: number
  rateSell?: number
  rateCross?: number
}

export type StoredTx = MonoStatementItem & { accountId: string }
