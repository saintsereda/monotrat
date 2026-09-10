import { parseMonth } from './time'

export const NBSP = '\u00a0'
const MINUS = '−'

const MONTHS_NOM = ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень']
const MONTHS_GEN = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня']
const MONTHS_LOC = ['січні', 'лютому', 'березні', 'квітні', 'травні', 'червні', 'липні', 'серпні', 'вересні', 'жовтні', 'листопаді', 'грудні']
const MONTHS_SHORT = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру']
export const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']
export const WEEKDAYS = ['понеділок', 'вівторок', 'середа', 'четвер', 'пʼятниця', 'субота', 'неділя']

export function groupDigits(n: number): string {
  return String(Math.trunc(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)
}

const sign = (n: number) => (n < 0 ? MINUS : '')

export function formatUah(kop: number): string {
  const uah = Math.round(kop / 100)
  return `${sign(uah)}${groupDigits(uah)}${NBSP}₴`
}

export function formatUahExact(kop: number): string {
  const abs = Math.abs(Math.round(kop))
  const whole = Math.floor(abs / 100)
  const frac = String(abs % 100).padStart(2, '0')
  return `${sign(kop)}${groupDigits(whole)},${frac}${NBSP}₴`
}

function oneDecimal(n: number): string {
  return n.toFixed(1).replace(/\.0$/, '').replace('.', ',')
}

export function formatCompact(kop: number): string {
  const uah = Math.abs(kop) / 100
  const s = sign(kop)
  if (uah < 10_000) return `${s}${groupDigits(Math.round(uah))}${NBSP}₴`
  if (uah < 1_000_000) return `${s}${oneDecimal(uah / 1000)}${NBSP}тис${NBSP}₴`
  return `${s}${oneDecimal(uah / 1_000_000)}${NBSP}млн${NBSP}₴`
}

export function formatPercent(ratio: number): string {
  return `${oneDecimal(ratio * 100)}%`
}

export function formatDelta(ratio: number | null): string {
  if (ratio === null || !Number.isFinite(ratio)) return '—'
  const pct = Math.round(ratio * 100)
  return `${pct > 0 ? '+' : pct < 0 ? MINUS : ''}${Math.abs(pct)}%`
}

export function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1]
  return forms[2]
}

export function monthLabel(key: string): string {
  const { year, month } = parseMonth(key)
  return `${MONTHS_NOM[month - 1]} ${year}`
}

export function monthName(key: string): string {
  return MONTHS_NOM[parseMonth(key).month - 1]
}

export function monthLocative(key: string): string {
  return MONTHS_LOC[parseMonth(key).month - 1]
}

export function shortMonth(key: string): string {
  return MONTHS_SHORT[parseMonth(key).month - 1]
}

export function dayLabel(dayKey: string): string {
  const [, m, d] = dayKey.split('-').map(Number)
  return `${d} ${MONTHS_GEN[m - 1]}`
}
