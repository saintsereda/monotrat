import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LOGO_CACHE_KEY, SEARCH_URL, type SearchHit, createLogoResolver, pickHit, searchQuery } from './search'

const hit = (name: string, domain: string): SearchHit => ({
  name,
  domain,
  icon: `https://cdn.brandfetch.io/id-${domain}/w/128/h/128/fallback/lettermark/icon.webp?c=key`,
})

describe('searchQuery', () => {
  it.each([
    ['LIQPAY*Кава на Подолі', 'кава на подолі'],
    ['Зоомагазин «Лапа» №3', 'зоомагазин лапа'],
    ['www.example.com.ua', 'example'],
    ['ТОВ Смачно', 'смачно'],
  ])('%s → %s', (label, query) => {
    expect(searchQuery(label)).toBe(query)
  })

  it.each(['ФОП Іваненко Іван', '12345', ''])('%s → nothing to search', (label) => {
    expect(searchQuery(label)).toBeNull()
  })
})

describe('pickHit', () => {
  it('prefers a Ukrainian domain among matching hits', () => {
    expect(pickHit('eva', [hit('Eva.vn', 'eva.vn'), hit('Лінія магазинів EVA', 'eva.ua')])?.domain).toBe('eva.ua')
  })

  it('accepts a longer official name', () => {
    expect(pickHit('атб', [hit('АТБ-МАРКЕТ', 'atbmarket.com')])?.domain).toBe('atbmarket.com')
  })

  it('takes exactly the requested domain for known brands', () => {
    expect(pickHit('okko.ua', [hit('Okko', 'okko.tv'), hit('OKKO', 'okko.ua')])?.domain).toBe('okko.ua')
    expect(pickHit('okko.ua', [hit('Okko', 'okko.tv')])).toBeNull()
  })

  it('rejects namesakes that do not match and russian domains', () => {
    expect(pickHit('кава на подолі', [hit('На пенсії', 'napensii.ua')])).toBeNull()
    expect(pickHit('атб', [hit('ООО АТБ Электроника', 'atb-e.ru')])).toBeNull()
  })
})

function fakeSearch(results: Record<string, SearchHit[]>, status = 200) {
  return vi.fn(async (url: string) => {
    const query = decodeURIComponent(url.slice(SEARCH_URL.length))
    return new Response(JSON.stringify(results[query] ?? []), { status })
  })
}

describe('logo resolver', () => {
  beforeEach(() => localStorage.clear())

  it('looks a name up once, keeps it for a day and asks for a 404 instead of a lettermark', async () => {
    const fetchImpl = fakeSearch({ 'aroma kava': [hit('Aroma Kava', 'aromakava.ua')] })
    const resolver = createLogoResolver({ fetchImpl, storage: localStorage, now: () => 0 })

    const [a, b] = await Promise.all([resolver.resolve('aroma kava'), resolver.resolve('aroma kava')])
    expect(a).toBe('https://cdn.brandfetch.io/id-aromakava.ua/w/128/h/128/fallback/404/icon.webp?c=key')
    expect(b).toBe(a)
    expect(fetchImpl).toHaveBeenCalledTimes(1)

    expect(createLogoResolver({ fetchImpl, storage: localStorage, now: () => 3_600_000 }).peek('aroma kava')).toBe(a)
    expect(createLogoResolver({ fetchImpl, storage: localStorage, now: () => 25 * 3_600_000 }).peek('aroma kava')).toBeUndefined()
  })

  it('remembers misses but not rate limits', async () => {
    const limited = createLogoResolver({ fetchImpl: fakeSearch({}, 429), storage: localStorage, now: () => 0 })
    expect(await limited.resolve('нічого')).toBeNull()
    expect(limited.peek('нічого')).toBeUndefined()

    const empty = createLogoResolver({ fetchImpl: fakeSearch({}), storage: localStorage, now: () => 0 })
    expect(await empty.resolve('нічого')).toBeNull()
    expect(empty.peek('нічого')).toBeNull()
  })

  it('runs at most two searches at once', async () => {
    const pending: (() => void)[] = []
    const fetchImpl = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          pending.push(() => resolve(new Response('[]')))
        }),
    )
    const resolver = createLogoResolver({ fetchImpl, storage: localStorage, now: () => 0 })
    const all = Promise.all(['a1', 'b2', 'c3'].map((q) => resolver.resolve(q)))
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(2))
    pending.shift()?.()
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(3))
    for (const release of pending.splice(0)) release()
    await all
  })

  it('forgets everything on clear', async () => {
    const resolver = createLogoResolver({ fetchImpl: fakeSearch({}), storage: localStorage, now: () => 0 })
    await resolver.resolve('щось')
    expect(localStorage.getItem(LOGO_CACHE_KEY)).not.toBeNull()
    resolver.clear()
    expect(resolver.peek('щось')).toBeUndefined()
    expect(localStorage.getItem(LOGO_CACHE_KEY)).toBeNull()
  })
})
