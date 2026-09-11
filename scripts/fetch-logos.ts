/**
 * Downloads real logos for src/logos/brands.ts into public/logos/<slug>.webp (128×128).
 *
 *   node scripts/fetch-logos.ts            # brands without a logo yet
 *   node scripts/fetch-logos.ts okko wog   # re-fetch these
 *
 * Candidates: the site's apple-touch-icon, <link rel=icon> and manifest icons, plus Google's favicon
 * service; the biggest bitmap wins. Writes node_modules/.tmp/logos-sheet.png to eyeball the result.
 */
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import sharp from 'sharp'
import { BRANDS, type Brand } from '../src/logos/brands.ts'

const OUT_DIR = new URL('../public/logos/', import.meta.url)
const SHEET = new URL('../node_modules/.tmp/logos-sheet.png', import.meta.url)
const SIZE = 128
const MIN_SOURCE = 96
const VECTOR_SIZE = 512
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'

async function get(url: string): Promise<Response | null> {
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(15_000) })
    return res.ok ? res : null
  } catch {
    return null
  }
}

function attr(tag: string, name: string): string | undefined {
  const m = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag)
  return m ? (m[1] ?? m[2] ?? m[3]) : undefined
}

async function manifestIcons(url: string): Promise<string[]> {
  const res = await get(url)
  if (!res) return []
  try {
    const manifest = (await res.json()) as { icons?: { src: string }[] }
    return (manifest.icons ?? []).map((icon) => new URL(icon.src, res.url).href)
  } catch {
    return []
  }
}

async function candidates(domain: string): Promise<string[]> {
  const urls: string[] = []
  const res = await get(`https://${domain}/`)
  const base = res?.url ?? `https://${domain}/`
  if (res) {
    const html = await res.text()
    for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
      const rel = attr(tag, 'rel')?.toLowerCase() ?? ''
      const href = attr(tag, 'href')
      if (!href) continue
      const url = new URL(href.replaceAll('&amp;', '&'), base).href
      // inline icons belong to bot-protection pages (Cloudflare), not to the brand
      if (url.startsWith('data:')) continue
      if (rel.includes('apple-touch-icon') || rel.split(/\s+/).includes('icon')) urls.push(url)
      else if (rel === 'manifest') urls.push(...(await manifestIcons(url)))
    }
  }
  urls.push(new URL('/apple-touch-icon.png', base).href)
  urls.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=256`)
  return [...new Set(urls)]
}

async function measure(url: string): Promise<{ url: string; data: Buffer; size: number } | null> {
  const res = await get(url)
  if (!res) return null
  const data = Buffer.from(await res.arrayBuffer())
  try {
    const meta = await sharp(data).metadata()
    const size = meta.format === 'svg' ? VECTOR_SIZE : Math.min(meta.width ?? 0, meta.height ?? 0)
    // white marks for dark themes (YouTube, OpenAI) vanish on our white plate
    const flat = await sharp(data, { density: 72 }).flatten({ background: '#ffffff' }).toBuffer()
    const { channels } = await sharp(flat).stats()
    if (channels.slice(0, 3).every((c) => c.mean > 245 && c.stdev < 12)) return null
    return { url, data, size }
  } catch {
    return null // .ico and other formats sharp can't read
  }
}

/** Opaque icons fill the circle; transparent ones get a white plate with some air around the mark. */
async function normalize(data: Buffer): Promise<Buffer> {
  const image = sharp(data, { density: 300 })
  const stats = await image.clone().stats()
  const transparent = !stats.isOpaque
  const inner = transparent ? Math.round(SIZE * 0.78) : SIZE
  const pad = (SIZE - inner) / 2
  return image
    .resize(inner, inner, { fit: transparent ? 'contain' : 'cover', background: '#ffffff00' })
    .extend({ top: Math.floor(pad), bottom: Math.ceil(pad), left: Math.floor(pad), right: Math.ceil(pad), background: '#ffffff00' })
    .flatten({ background: '#ffffff' })
    .webp({ quality: 90 })
    .toBuffer()
}

async function fetchBrand(brand: Brand): Promise<string> {
  const found = (await Promise.all((await candidates(brand.domain)).map(measure))).filter((c) => c !== null)
  const best = found.sort((a, b) => b.size - a.size)[0]
  if (!best) return `✗ ${brand.slug}: nothing found on ${brand.domain}`
  await sharp(await normalize(best.data)).toFile(new URL(`${brand.slug}.webp`, OUT_DIR).pathname)
  const warn = best.size < MIN_SOURCE ? `  ⚠ only ${best.size}px` : ''
  return `✓ ${brand.slug}: ${best.size}px ${best.url}${warn}`
}

async function contactSheet(brands: Brand[]): Promise<void> {
  const cell = 150
  const cols = 10
  const present = brands.filter((b) => existsSync(new URL(`${b.slug}.webp`, OUT_DIR)))
  const layers = await Promise.all(
    present.map(async (brand, i) => {
      const x = (i % cols) * cell
      const y = Math.floor(i / cols) * cell
      const mask = Buffer.from(`<svg width="96" height="96"><circle cx="48" cy="48" r="48"/></svg>`)
      const logo = await sharp(new URL(`${brand.slug}.webp`, OUT_DIR).pathname)
        .resize(96, 96)
        .composite([{ input: mask, blend: 'dest-in' }])
        .png()
        .toBuffer()
      const label = Buffer.from(
        `<svg width="${cell}" height="20"><text x="${cell / 2}" y="14" font-size="13" fill="#fff" text-anchor="middle" font-family="Helvetica">${brand.slug}</text></svg>`,
      )
      return [
        { input: logo, left: x + 27, top: y + 12 },
        { input: label, left: x, top: y + 118 },
      ]
    }),
  )
  await mkdir(new URL('.', SHEET), { recursive: true })
  await sharp({ create: { width: cols * cell, height: Math.ceil(present.length / cols) * cell, channels: 3, background: '#000' } })
    .composite(layers.flat())
    .png()
    .toFile(SHEET.pathname)
  console.log(`\nContact sheet: ${SHEET.pathname}`)
}

const only = new Set(process.argv.slice(2))
const todo = BRANDS.filter((b) => (only.size ? only.has(b.slug) : !existsSync(new URL(`${b.slug}.webp`, OUT_DIR))))
await mkdir(OUT_DIR, { recursive: true })

const CONCURRENCY = 6
for (let i = 0; i < todo.length; i += CONCURRENCY) {
  for (const line of await Promise.all(todo.slice(i, i + CONCURRENCY).map(fetchBrand))) console.log(line)
}
await contactSheet(BRANDS)
