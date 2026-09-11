import { merchantKeyOf } from '../analytics/normalize'

/**
 * Logos for merchants missing from the bundled set: Brandfetch's free search maps a name to a brand
 * and returns a hotlinkable icon. Only the cleaned merchant name leaves the browser — no amounts,
 * no token. Results are cached per name in localStorage.
 */
export const SEARCH_URL = 'https://api.brandfetch.io/v2/search/'
export const LOGO_CACHE_KEY = 'monotrat.logos'
/** icon links carry a temporary key that Brandfetch expires after 24 h */
const HIT_TTL_MS = 20 * 60 * 60 * 1000
const MISS_TTL_MS = 7 * 24 * 60 * 60 * 1000
/** Brandfetch allows 200 searches per 5 minutes per IP; two at a time stays well below */
const MAX_CONCURRENT = 2
const TOP_HITS = 5

export interface SearchHit {
  name?: string | null
  domain?: string | null
  icon?: string | null
}

const AGGREGATOR_RE = /^\s*(liqpay|wfp|wayforpay|fondy|portmone|ipay|platon|easypay|tranzzo|paypal|pp|sq|sp)\s*\*\s*/i
const NOISE_RE = /(?:^| )(тов|фоп|пп|ооо|llc|ltd|inc|gmbh|limited|www|com|ua|net|org|io)(?= |$)/gu
const BLOCKED_TLD_RE = /\.(ru|su|by)$/i

/** Cleaned name to search for, or null when there is nothing brand-like (a person, digits only…). */
export function searchQuery(label: string): string | null {
  if (/^\s*(фоп|fop)\s/i.test(label)) return null
  const key = merchantKeyOf(label.replace(AGGREGATOR_RE, ''))
    .replace(NOISE_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const query = key.split(' ').slice(0, 4).join(' ')
  return query !== 'невідомо' && /\p{L}{2}/u.test(query) ? query : null
}

const compact = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')

/**
 * Brandfetch ranks worldwide, so its first hit is often a namesake abroad. Keep hits whose name or
 * domain actually matches the query, drop .ru/.by, prefer Ukrainian domains.
 */
export function pickHit(query: string, hits: SearchHit[]): SearchHit | null {
  // known brands are searched by their domain: exactly that brand or nothing
  if (query.includes('.')) return hits.find((h) => h.domain === query && h.icon) ?? null
  const q = compact(query)
  if (q.length < 2) return null
  const close = (s: string) => s === q || (Math.min(s.length, q.length) >= 3 && (s.startsWith(q) || q.startsWith(s)))
  const matching = hits
    .slice(0, TOP_HITS)
    .filter((h) => h.domain && h.icon && !BLOCKED_TLD_RE.test(h.domain))
    .filter((h) => close(compact(h.name ?? '')) || close(compact(h.domain!.split('.')[0])))
  return matching.find((h) => /\.ua$/i.test(h.domain!)) ?? matching[0] ?? null
}

interface CacheEntry {
  icon: string | null
  at: number
}

export interface LogoResolver {
  /** cached icon (string), known miss (null) or not looked up yet (undefined) */
  peek(query: string): string | null | undefined
  resolve(query: string): Promise<string | null>
  clear(): void
}

export interface ResolverDeps {
  fetchImpl?: (input: string, init?: RequestInit) => Promise<Response>
  now?: () => number
  storage?: Storage | null
}

function defaultStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function createLogoResolver({
  fetchImpl = (input, init) => fetch(input, init),
  now = Date.now,
  storage = defaultStorage(),
}: ResolverDeps = {}): LogoResolver {
  const fresh = (e: CacheEntry) => now() - e.at < (e.icon ? HIT_TTL_MS : MISS_TTL_MS)
  const cache = new Map<string, CacheEntry>()
  try {
    const saved = JSON.parse(storage?.getItem(LOGO_CACHE_KEY) ?? '{}') as Record<string, CacheEntry>
    for (const [query, entry] of Object.entries(saved)) if (fresh(entry)) cache.set(query, entry)
  } catch {
    // corrupted cache — start over
  }
  const save = () => {
    try {
      storage?.setItem(LOGO_CACHE_KEY, JSON.stringify(Object.fromEntries(cache)))
    } catch {
      // quota or private mode — the cache just stays in memory
    }
  }

  const inflight = new Map<string, Promise<string | null>>()
  const waiting: (() => void)[] = []
  let active = 0
  const acquire = async () => {
    if (active < MAX_CONCURRENT) active++
    else await new Promise<void>((resolve) => waiting.push(resolve))
  }
  const release = () => {
    const next = waiting.shift()
    if (next) next()
    else active--
  }

  async function lookup(query: string): Promise<string | null> {
    await acquire()
    try {
      const res = await fetchImpl(SEARCH_URL + encodeURIComponent(query), { referrerPolicy: 'no-referrer' })
      // rate limit or outage: don't remember a miss, try again next time
      if (res.status === 429 || res.status >= 500) return null
      const hits: unknown = res.ok ? await res.json() : []
      const hit = pickHit(query, Array.isArray(hits) ? (hits as SearchHit[]) : [])
      // with fallback/404 a brand without an icon fails to load and we show the category instead of a lettermark
      const icon = hit?.icon ? hit.icon.replace('/fallback/lettermark/', '/fallback/404/') : null
      cache.set(query, { icon, at: now() })
      save()
      return icon
    } catch {
      return null
    } finally {
      release()
    }
  }

  return {
    peek(query) {
      const entry = cache.get(query)
      return entry && fresh(entry) ? entry.icon : undefined
    },
    resolve(query) {
      const known = this.peek(query)
      if (known !== undefined) return Promise.resolve(known)
      let pending = inflight.get(query)
      if (!pending) {
        pending = lookup(query).finally(() => inflight.delete(query))
        inflight.set(query, pending)
      }
      return pending
    },
    clear() {
      cache.clear()
      try {
        storage?.removeItem(LOGO_CACHE_KEY)
      } catch {
        // nothing to clear
      }
    },
  }
}

let shared: LogoResolver | null = null
export const logoResolver = (): LogoResolver => (shared ??= createLogoResolver())
