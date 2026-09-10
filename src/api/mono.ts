import type { Account } from '../analytics/types'
import type { MonoClientInfo, MonoCurrencyRate, MonoStatementItem } from './types'

export const API_BASE = 'https://api.monobank.ua'
export const STATEMENT_PAGE_LIMIT = 500

export class MonoApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'MonoApiError'
    this.status = status
  }
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export interface MonoClient {
  getClientInfo(): Promise<MonoClientInfo>
  getStatement(account: string, from: number, to: number): Promise<MonoStatementItem[]>
}

const defaultFetch: FetchLike = (input, init) => fetch(input, init)

async function request<T>(fetchImpl: FetchLike, path: string, token?: string): Promise<T> {
  let response: Response
  try {
    response = await fetchImpl(`${API_BASE}${path}`, { headers: token ? { 'X-Token': token } : {} })
  } catch (error) {
    throw new MonoApiError(0, error instanceof Error ? error.message : 'Network error')
  }
  if (!response.ok) {
    let message = `HTTP ${response.status}`
    try {
      const body: unknown = await response.json()
      if (body && typeof body === 'object' && 'errorDescription' in body && typeof body.errorDescription === 'string') {
        message = body.errorDescription
      }
    } catch {
      // body is not JSON — keep the HTTP status message
    }
    throw new MonoApiError(response.status, message)
  }
  return (await response.json()) as T
}

export function createMonoClient(token: string, fetchImpl: FetchLike = defaultFetch): MonoClient {
  return {
    getClientInfo: () => request<MonoClientInfo>(fetchImpl, '/personal/client-info', token),
    getStatement: (account, from, to) =>
      request<MonoStatementItem[]>(fetchImpl, `/personal/statement/${encodeURIComponent(account)}/${from}/${to}`, token),
  }
}

export function getCurrency(fetchImpl: FetchLike = defaultFetch): Promise<MonoCurrencyRate[]> {
  return request<MonoCurrencyRate[]>(fetchImpl, '/bank/currency')
}

const CARD_TITLES: Record<string, string> = {
  black: 'Чорна картка',
  white: 'Біла картка',
  platinum: 'Platinum',
  iron: 'Залізна картка',
  fop: 'ФОП',
  yellow: 'Дитяча картка',
  eAid: 'єПідтримка',
  madeInUkraine: 'Made in Ukraine',
  rebuilding: 'Картка Відновлення',
}

const CURRENCY_NAMES: Record<number, string> = { 980: 'UAH', 840: 'USD', 978: 'EUR', 985: 'PLN', 826: 'GBP' }

export function currencyName(code: number): string {
  return CURRENCY_NAMES[code] ?? String(code)
}

export function accountsFromClientInfo(info: MonoClientInfo): Account[] {
  const accounts: Account[] = info.accounts.map((a) => ({
    id: a.id,
    kind: a.type === 'fop' ? 'fop' : 'card',
    type: a.type,
    title: `${CARD_TITLES[a.type] ?? 'Рахунок'}${a.currencyCode === 980 ? '' : ` · ${currencyName(a.currencyCode)}`}`,
    currencyCode: a.currencyCode,
    iban: a.iban,
    balance: a.balance,
  }))
  const jars: Account[] = (info.jars ?? []).map((j) => ({
    id: j.id,
    kind: 'jar',
    title: j.title,
    currencyCode: j.currencyCode,
    balance: j.balance,
  }))
  return [...accounts, ...jars]
}
