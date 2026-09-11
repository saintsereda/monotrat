import { useEffect, useState } from 'react'
import type { CategoryId } from '../analytics/types'
import { type Brand, brandFor } from './brands'
import { logoResolver, searchQuery } from './search'

/** people, the bank itself, taxes, jars — nothing brand-like to show */
const NO_LOGO: ReadonlySet<CategoryId> = new Set<CategoryId>(['transfers', 'cash', 'finance', 'taxes', 'donations', 'payments'])

const brandCache = new Map<string, Brand | null>()

function cachedBrand(label: string): Brand | null {
  let brand = brandCache.get(label)
  if (brand === undefined) {
    brand = brandFor(label)
    brandCache.set(label, brand)
  }
  return brand
}

/**
 * Logo URLs to try in order, empty when there is none (show the category instead):
 * a bundled logo for known brands, Brandfetch by exact domain for `remote` ones, a name search otherwise.
 */
export function useMerchantLogos(label: string, category: CategoryId): string[] {
  const eligible = !NO_LOGO.has(category)
  const brand = eligible ? cachedBrand(label) : null
  const query = !eligible ? null : brand ? (brand.remote ? brand.domain : null) : searchQuery(label)
  const [found, setFound] = useState<{ query: string; icon: string | null } | null>(null)

  useEffect(() => {
    if (!query) return
    let alive = true
    void logoResolver()
      .resolve(query)
      .then((icon) => {
        if (alive) setFound({ query, icon })
      })
    return () => {
      alive = false
    }
  }, [query])

  const online = query ? (found?.query === query ? found.icon : (logoResolver().peek(query) ?? null)) : null
  const bundled = brand ? `${import.meta.env.BASE_URL}logos/${brand.slug}.webp` : null
  return [online, bundled].filter((url): url is string => url !== null)
}
