/// <reference types="node" />
import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BRANDS, brandFor } from './brands'

describe('brandFor', () => {
  it.each([
    ['АТБ', 'atb'],
    ['АТБ-Маркет №1234', 'atb'],
    ['Сільпо', 'silpo'],
    ['Нова Пошта', 'novaposhta'],
    ['NOVA POSHTA', 'novaposhta'],
    ['McDonald’s', 'mcdonalds'],
    ['UBER *TRIP', 'uber'],
    ['Google YouTube', 'youtube'],
    ['PAYPAL *STEAMGAMES', 'steam'],
    ['APPLE.COM/BILL', 'apple'],
    ['METRO Cash&Carry', 'metro'],
    ['H&M', 'hm'],
    ['OKKO', 'okko'],
  ])('%s → %s', (label, slug) => {
    expect(brandFor(label)?.slug).toBe(slug)
  })

  it.each(['Олена К.', 'Кава на Подолі', 'Київський метрополітен', 'Автомийка Metro', 'Kubernetes shop'])('%s → nothing', (label) => {
    expect(brandFor(label)).toBeNull()
  })

  it('has unique slugs', () => {
    const slugs = BRANDS.map((b) => b.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('ships a logo for every brand that is not hotlinked', () => {
    const missing = BRANDS.filter((b) => !b.remote && !existsSync(`public/logos/${b.slug}.webp`))
    expect(missing.map((b) => b.slug)).toEqual([])
  })
})
