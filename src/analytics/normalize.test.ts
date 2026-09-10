import { describe, expect, it } from 'vitest'
import type { StoredTx } from '../api/types'
import { buildRateTable, merchantKeyOf, normalizeAll, toUah } from './normalize'
import type { Account } from './types'

const accounts: Account[] = [
  { id: 'black', kind: 'card', title: 'Чорна картка', currencyCode: 980, iban: 'UA_BLACK', balance: 0 },
  { id: 'white', kind: 'card', title: 'Біла картка', currencyCode: 980, iban: 'UA_WHITE', balance: 0 },
  { id: 'usd', kind: 'card', title: 'Чорна картка · USD', currencyCode: 840, balance: 0 },
  { id: 'jar', kind: 'jar', title: 'Відпустка', currencyCode: 980, balance: 0 },
]
const rates = { 980: 1, 840: 41.5 }

let seq = 0
const tx = (p: Partial<StoredTx> & { accountId: string; amount: number }): StoredTx => ({
  id: `t${++seq}`, time: 1_780_000_000, description: 'Опис', mcc: 5411, hold: false,
  operationAmount: p.amount, currencyCode: 980, commissionRate: 0, cashbackAmount: 0, balance: 0, ...p,
})

const one = (item: StoredTx) => normalizeAll([item], { accounts, rates })[0]

describe('rates', () => {
  it('builds a UAH rate table from mono currency rates', () => {
    const table = buildRateTable([
      { currencyCodeA: 840, currencyCodeB: 980, date: 1, rateBuy: 41, rateSell: 42 },
      { currencyCodeA: 985, currencyCodeB: 980, date: 1, rateCross: 11.2 },
      { currencyCodeA: 978, currencyCodeB: 840, date: 1, rateBuy: 1.1, rateSell: 1.2 },
    ])
    expect(table).toEqual({ 980: 1, 840: 41.5, 985: 11.2 })
  })

  it('converts minor units to kopecks', () => {
    expect(toUah(-1000, 840, rates)).toBe(-41500)
    expect(toUah(-1000, 980, rates)).toBe(-1000)
    expect(toUah(-1000, 999, rates)).toBe(0)
  })
})

describe('merchantKeyOf', () => {
  it.each([
    ['АТБ', 'атб'],
    ['Сільпо №123', 'сільпо'],
    ['McDonald’s Kyiv', 'mcdonalds'],
    ['Glovo 12345', 'glovo'],
    ['«Аптека Доброго Дня»', 'аптека доброго дня'],
    ['Сільпо Київ', 'сільпо'],
    ['***', 'невідомо'],
  ])('%s → %s', (input, expected) => {
    expect(merchantKeyOf(input)).toBe(expected)
  })
})

describe('normalizeAll', () => {
  it('classifies a plain purchase', () => {
    const n = one(tx({ accountId: 'black', amount: -95000, mcc: 5411, description: 'АТБ', cashbackAmount: 950, hold: true }))
    expect(n).toMatchObject({ kind: 'expense', category: 'groceries', amountUah: -95000, cashbackUah: 950, hold: true, merchantKey: 'атб', accountKind: 'card' })
  })

  it('converts foreign-currency accounts', () => {
    expect(one(tx({ accountId: 'usd', amount: -1000, currencyCode: 840 })).amountUah).toBe(-41500)
  })

  it('pairs transfers between own accounts', () => {
    const [a, b] = normalizeAll([
      tx({ accountId: 'black', amount: -300000, mcc: 4829, time: 1000, description: 'На банку' }),
      tx({ accountId: 'jar', amount: 300000, mcc: 4829, time: 1002, description: 'З чорної картки' }),
    ], { accounts, rates })
    expect(a).toMatchObject({ kind: 'internal', counterKind: 'jar' })
    expect(b).toMatchObject({ kind: 'internal', counterKind: 'card' })
  })

  it('does not pair transfers too far apart in time', () => {
    const [a] = normalizeAll([
      tx({ accountId: 'black', amount: -300000, mcc: 4829, time: 1000, description: 'Олена К.' }),
      tx({ accountId: 'white', amount: 300000, mcc: 4829, time: 5000, description: 'Від: Олена К.' }),
    ], { accounts, rates })
    expect(a.kind).toBe('expense')
  })

  it('detects own IBAN, own jar title and own-card descriptions', () => {
    expect(one(tx({ accountId: 'black', amount: -5000, mcc: 4829, counterIban: 'UA_WHITE' }))).toMatchObject({ kind: 'internal', counterKind: 'card' })
    expect(one(tx({ accountId: 'black', amount: -100000, mcc: 4829, description: 'На банку «Відпустка»' }))).toMatchObject({ kind: 'internal', counterKind: 'jar' })
    expect(one(tx({ accountId: 'white', amount: 70000, mcc: 4829, description: 'З чорної картки' })).kind).toBe('internal')
  })

  it('classifies cashback payouts, refunds, income and donations', () => {
    expect(one(tx({ accountId: 'black', amount: 12000, mcc: 4829, description: 'Виведення кешбеку' })).kind).toBe('cashbackPayout')
    expect(one(tx({ accountId: 'black', amount: 50000, mcc: 5651, description: 'ZARA' }))).toMatchObject({ kind: 'refund', category: 'clothes' })
    expect(one(tx({ accountId: 'black', amount: 6500000, mcc: 4829, description: 'Від: ТОВ Ромашка' }))).toMatchObject({ kind: 'income', category: 'transfers' })
    expect(one(tx({ accountId: 'black', amount: -20000, mcc: 4829, description: 'Банка «На FPV»' }))).toMatchObject({ kind: 'expense', category: 'donations' })
  })

  it('sorts by time ascending', () => {
    const out = normalizeAll([
      tx({ accountId: 'black', amount: -1, time: 30 }),
      tx({ accountId: 'black', amount: -1, time: 10 }),
    ], { accounts, rates })
    expect(out.map((t) => t.time)).toEqual([10, 30])
  })
})
