export const KYIV_TZ = 'Europe/Kyiv'
export const DAY = 86400

export interface KyivParts {
  year: number
  month: number // 1-12
  day: number
  hour: number
  minute: number
  second: number
  weekday: number // 0 = Monday … 6 = Sunday
}

const partsFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: KYIV_TZ,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hourCycle: 'h23', weekday: 'short',
})
const WEEKDAY_CODES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function kyivParts(unixSec: number): KyivParts {
  const map: Record<string, string> = {}
  for (const part of partsFormat.formatToParts(new Date(unixSec * 1000))) map[part.type] = part.value
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
    weekday: WEEKDAY_CODES.indexOf(map.weekday),
  }
}

function offsetSec(unixSec: number): number {
  const p = kyivParts(unixSec)
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) / 1000 - unixSec
}

export function kyivToUnix(year: number, month: number, day: number, hour = 0): number {
  const guess = Date.UTC(year, month - 1, day, hour) / 1000
  const first = guess - offsetSec(guess)
  return guess - offsetSec(first)
}

const pad = (n: number) => String(n).padStart(2, '0')

export function monthKey(unixSec: number): string {
  const p = kyivParts(unixSec)
  return `${p.year}-${pad(p.month)}`
}

export function dayKey(unixSec: number): string {
  const p = kyivParts(unixSec)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`
}

export function parseMonth(key: string): { year: number; month: number } {
  const [y, m] = key.split('-').map(Number)
  return { year: y, month: m }
}

export function addMonths(key: string, n: number): string {
  const { year, month } = parseMonth(key)
  const index = year * 12 + (month - 1) + n
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`
}

export function monthStart(key: string): number {
  const { year, month } = parseMonth(key)
  return kyivToUnix(year, month, 1)
}

/** Exclusive end: start of the next month. */
export function monthEnd(key: string): number {
  return monthStart(addMonths(key, 1))
}

export function daysInMonth(key: string): number {
  const { year, month } = parseMonth(key)
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function recentMonths(nowSec: number, count: number): string[] {
  const current = monthKey(nowSec)
  return Array.from({ length: count }, (_, i) => addMonths(current, -i))
}
