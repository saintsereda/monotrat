import type { MonoCurrencyRate, StoredTx } from '../api/types'
import { NON_MERCHANT_CATEGORIES, TRANSFER_MCCS, categoryForMcc } from './categories'
import type { Account, AccountKind, CategoryId, NormalizedTx, TxKind } from './types'

export type RateTable = Readonly<Record<number, number>>

export interface NormalizeContext {
  accounts: Account[]
  rates: RateTable
}

export function buildRateTable(rates: MonoCurrencyRate[]): RateTable {
  const table: Record<number, number> = { 980: 1 }
  for (const r of rates) {
    if (r.currencyCodeB !== 980) continue
    const mid = r.rateBuy !== undefined && r.rateSell !== undefined ? (r.rateBuy + r.rateSell) / 2 : undefined
    const rate = r.rateCross ?? mid ?? r.rateBuy ?? r.rateSell
    if (rate) table[r.currencyCodeA] = rate
  }
  return table
}

export function toUah(amountMinor: number, currencyCode: number, rates: RateTable): number {
  if (currencyCode === 980) return amountMinor
  const rate = rates[currencyCode]
  return rate ? Math.round(amountMinor * rate) : 0
}

const NOT_WORD_BEFORE = '(?<![\\p{L}\\p{N}])'
const NOT_WORD_AFTER = '(?![\\p{L}\\p{N}])'
const CITY_RE = new RegExp(
  `${NOT_WORD_BEFORE}(kyiv|kiev|lviv|odesa|odessa|kharkiv|dnipro|ukraine|ua|київ|львів|одеса|харків|дніпро|україна)${NOT_WORD_AFTER}`,
  'gu',
)
const NUMBER_RE = new RegExp(`${NOT_WORD_BEFORE}\\p{N}+${NOT_WORD_AFTER}`, 'gu')

export function merchantKeyOf(description: string): string {
  const key = description
    .toLowerCase()
    .replace(/[«»"'`’ʼ]/g, '')
    .replace(/[№#]\s*\d+/g, ' ')
    .replace(CITY_RE, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(NUMBER_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return key || 'невідомо'
}

const OWN_TRANSFER_RE = /^(з|із|на)\s+(чорн|біл|залізн|платинов|гривнев|доларов|євро|фоп|єпідтримк|дитяч)/i
const CASHBACK_RE = /кешбек|cashback/i
const JAR_WORD_RE = /банк/i
const PAIR_WINDOW_SEC = 180
const REFUND_WINDOW_SEC = 90 * 86400

/**
 * A refund (released hold, returned goods) cancels the latest earlier purchase on the same account
 * at the same merchant — or with the same MCC and the exact same amount. Full refunds turn both into
 * `reversed`; partial ones reduce the purchase. Refunds without a match stay `refund`.
 */
function offsetRefunds(list: NormalizedTx[]): void {
  for (let i = 0; i < list.length; i++) {
    const refund = list[i]
    if (refund.kind !== 'refund') continue
    for (let j = i - 1; j >= 0; j--) {
      const buy = list[j]
      if (refund.time - buy.time > REFUND_WINDOW_SEC) break
      if (buy.kind !== 'expense' || buy.accountId !== refund.accountId) continue
      const sameMerchant = buy.merchantKey === refund.merchantKey
      const sameCharge = buy.mcc === refund.mcc && buy.amountUah + refund.amountUah === 0
      if ((!sameMerchant && !sameCharge) || refund.amountUah > -buy.amountUah) continue
      buy.amountUah += refund.amountUah
      refund.kind = 'reversed'
      if (buy.amountUah === 0) {
        buy.kind = 'reversed'
        buy.cashbackUah = 0
      }
      break
    }
  }
}

interface Draft {
  item: StoredTx
  accountKind: AccountKind
  amountUah: number
  kind?: TxKind
  counterKind?: AccountKind
}

/** mono books service payments ("Платіж …", "Щомісячний платіж …") with the same MCC 4829 as transfers to people */
const SERVICE_PAYMENT_RE = /^(щомісячний\s+)?(платіж|оплата)(?!\p{L})/iu

function pairInternal(drafts: Draft[]): void {
  for (let i = 0; i < drafts.length; i++) {
    const out = drafts[i]
    if (out.kind || out.amountUah >= 0) continue
    for (let j = 0; j < drafts.length; j++) {
      const inn = drafts[j]
      if (inn.kind || inn.amountUah <= 0 || inn.item.accountId === out.item.accountId) continue
      if (Math.abs(inn.item.time - out.item.time) > PAIR_WINDOW_SEC) continue
      const tolerance = Math.max(Math.abs(out.amountUah) * 0.01, 100)
      if (Math.abs(out.amountUah + inn.amountUah) > tolerance) continue
      out.kind = 'internal'
      out.counterKind = inn.accountKind
      inn.kind = 'internal'
      inn.counterKind = out.accountKind
      break
    }
  }
}

export function normalizeAll(items: StoredTx[], ctx: NormalizeContext): NormalizedTx[] {
  const byId = new Map(ctx.accounts.map((a) => [a.id, a]))
  const byIban = new Map(ctx.accounts.filter((a) => a.iban).map((a) => [a.iban as string, a]))
  const jarTitles = ctx.accounts
    .filter((a) => a.kind === 'jar' && a.title.trim().length >= 3)
    .map((a) => a.title.trim().toLowerCase())

  const drafts: Draft[] = [...items]
    .sort((a, b) => a.time - b.time)
    .map((item) => {
      const account = byId.get(item.accountId)
      return {
        item,
        accountKind: account?.kind ?? 'card',
        amountUah: toUah(item.amount, account?.currencyCode ?? item.currencyCode, ctx.rates),
      }
    })

  pairInternal(drafts)

  const out = drafts.map((d): NormalizedTx => {
    const { item } = d
    let kind = d.kind
    let counterKind = d.counterKind
    let category: CategoryId = categoryForMcc(item.mcc)
    const description = item.description ?? ''
    const lower = description.toLowerCase()

    if (!kind && item.counterIban && byIban.has(item.counterIban)) {
      kind = 'internal'
      counterKind = byIban.get(item.counterIban)?.kind
    }
    if (!kind && TRANSFER_MCCS.has(item.mcc) && jarTitles.some((title) => lower.includes(title))) {
      kind = 'internal'
      counterKind = 'jar'
    }
    if (!kind && OWN_TRANSFER_RE.test(description)) kind = 'internal'
    if (!kind && d.amountUah > 0 && CASHBACK_RE.test(description)) kind = 'cashbackPayout'
    if (!kind && d.amountUah <= 0) {
      kind = 'expense'
      if (category === 'transfers' && SERVICE_PAYMENT_RE.test(description)) category = 'payments'
      else if (category === 'transfers' && JAR_WORD_RE.test(description)) category = 'donations'
    }
    if (!kind) kind = NON_MERCHANT_CATEGORIES.has(category) ? 'income' : 'refund'

    return {
      id: item.id,
      accountId: item.accountId,
      accountKind: d.accountKind,
      time: item.time,
      description,
      comment: item.comment,
      mcc: item.mcc,
      hold: item.hold,
      amountUah: d.amountUah,
      cashbackUah: Math.max(0, item.cashbackAmount ?? 0),
      kind,
      category,
      merchantKey: merchantKeyOf(description),
      counterKind,
    }
  })
  offsetRefunds(out)
  return out
}
