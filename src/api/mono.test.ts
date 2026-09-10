import { describe, expect, it, vi } from 'vitest'
import { MonoApiError, accountsFromClientInfo, createMonoClient, getCurrency } from './mono'
import type { MonoClientInfo } from './types'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('mono client', () => {
  it('requests a statement with the token header', async () => {
    const fetchImpl = vi.fn(async () => json([{ id: 'a' }]))
    const client = createMonoClient('secret', fetchImpl)
    const items = await client.getStatement('acc 1', 100, 200)
    expect(items).toEqual([{ id: 'a' }])
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.monobank.ua/personal/statement/acc%201/100/200',
      { headers: { 'X-Token': 'secret' } },
    )
  })

  it('throws MonoApiError with status and errorDescription', async () => {
    const client = createMonoClient('t', async () => json({ errorDescription: 'Too many requests' }, 429))
    const error = await client.getClientInfo().catch((e: unknown) => e)
    expect(error).toBeInstanceOf(MonoApiError)
    expect((error as MonoApiError).status).toBe(429)
    expect((error as MonoApiError).message).toBe('Too many requests')
  })

  it('maps network failures to status 0', async () => {
    const client = createMonoClient('t', async () => { throw new TypeError('Failed to fetch') })
    const error = await client.getClientInfo().catch((e: unknown) => e)
    expect((error as MonoApiError).status).toBe(0)
  })

  it('fetches currency without a token', async () => {
    const fetchImpl = vi.fn(async () => json([{ currencyCodeA: 840, currencyCodeB: 980, date: 1, rateBuy: 41, rateSell: 42 }]))
    const rates = await getCurrency(fetchImpl)
    expect(rates).toHaveLength(1)
    expect(fetchImpl).toHaveBeenCalledWith('https://api.monobank.ua/bank/currency', { headers: {} })
  })
})

describe('accountsFromClientInfo', () => {
  it('maps cards, FOP accounts and jars', () => {
    const info: MonoClientInfo = {
      clientId: 'c', name: 'Тест',
      accounts: [
        { id: 'b', balance: 100, type: 'black', currencyCode: 980, iban: 'UA1' },
        { id: 'u', balance: 5, type: 'white', currencyCode: 840 },
        { id: 'f', balance: 0, type: 'fop', currencyCode: 980, iban: 'UA2' },
      ],
      jars: [{ id: 'j', title: 'Відпустка', currencyCode: 980, balance: 300 }],
    }
    expect(accountsFromClientInfo(info)).toEqual([
      { id: 'b', kind: 'card', title: 'Чорна картка', currencyCode: 980, iban: 'UA1', balance: 100 },
      { id: 'u', kind: 'card', title: 'Біла картка · USD', currencyCode: 840, iban: undefined, balance: 5 },
      { id: 'f', kind: 'fop', title: 'ФОП', currencyCode: 980, iban: 'UA2', balance: 0 },
      { id: 'j', kind: 'jar', title: 'Відпустка', currencyCode: 980, balance: 300 },
    ])
  })
})
