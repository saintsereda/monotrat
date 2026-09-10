import type { StoredTx } from '../api/types'
import { DAY, addMonths, daysInMonth, kyivParts, kyivToUnix, monthKey, parseMonth } from '../analytics/time'
import type { Account } from '../analytics/types'
import { type Random, mulberry32, poisson, randInt, uniform } from './random'

export const DEMO_MONTHS = 13

export const DEMO_ACCOUNTS: Account[] = [
  { id: 'demo-black', kind: 'card', title: 'Чорна картка', currencyCode: 980, iban: 'UA000000000000000000000000001', balance: 2_845_000 },
  { id: 'demo-white', kind: 'card', title: 'Біла картка', currencyCode: 980, iban: 'UA000000000000000000000000002', balance: 120_000 },
  { id: 'demo-jar', kind: 'jar', title: 'На відпустку', currencyCode: 980, balance: 3_600_000 },
]
const BLACK = 'demo-black'
const WHITE = 'demo-white'
const JAR = 'demo-jar'

interface MerchantSpec {
  description: string
  mcc: number
  /** UAH */
  min: number
  max: number
  perWeek: number
  /** [from, to) Kyiv hours */
  hours: [number, number]
  /** multiplier of the daily rate on weekends */
  weekend?: number
  account?: string
  cashback?: number
}

const MERCHANTS: MerchantSpec[] = [
  { description: 'АТБ', mcc: 5411, min: 120, max: 780, perWeek: 3, hours: [9, 21], cashback: 0.01 },
  { description: 'Сільпо', mcc: 5411, min: 300, max: 2100, perWeek: 1.3, hours: [11, 21], weekend: 1.8, cashback: 0.01 },
  { description: 'Novus', mcc: 5411, min: 200, max: 1400, perWeek: 0.5, hours: [10, 20] },
  { description: 'Aroma Kava', mcc: 5814, min: 65, max: 150, perWeek: 4, hours: [8, 11], weekend: 0.4, cashback: 0.05 },
  { description: 'Lviv Croissants', mcc: 5814, min: 120, max: 320, perWeek: 0.8, hours: [9, 15], account: WHITE },
  { description: "McDonald's", mcc: 5814, min: 170, max: 460, perWeek: 0.6, hours: [12, 24], weekend: 1.5 },
  { description: 'Пузата Хата', mcc: 5812, min: 230, max: 560, perWeek: 0.7, hours: [12, 15], weekend: 0.3 },
  { description: 'Glovo', mcc: 5812, min: 320, max: 950, perWeek: 0.9, hours: [19, 24], weekend: 2, cashback: 0.02 },
  { description: 'Uklon', mcc: 4121, min: 110, max: 420, perWeek: 1.2, hours: [8, 24], weekend: 1.6 },
  { description: 'Bolt', mcc: 4121, min: 100, max: 380, perWeek: 0.9, hours: [18, 24], weekend: 2 },
  { description: 'Київський метрополітен', mcc: 4111, min: 8, max: 8, perWeek: 5, hours: [8, 19], weekend: 0.3 },
  { description: 'Аптека Доброго Дня', mcc: 5912, min: 90, max: 850, perWeek: 0.5, hours: [10, 21] },
  { description: 'EVA', mcc: 5977, min: 150, max: 900, perWeek: 0.3, hours: [11, 20] },
  { description: 'OKKO', mcc: 5541, min: 900, max: 2100, perWeek: 0.4, hours: [7, 21] },
  { description: 'Епіцентр', mcc: 5200, min: 250, max: 3800, perWeek: 0.2, hours: [11, 20], weekend: 2 },
  { description: 'MasterZoo', mcc: 5995, min: 280, max: 1200, perWeek: 0.25, hours: [11, 20] },
  { description: 'Multiplex', mcc: 7832, min: 180, max: 520, perWeek: 0.2, hours: [18, 22], weekend: 2 },
  { description: 'Rozetka', mcc: 5732, min: 400, max: 5200, perWeek: 0.15, hours: [10, 24] },
  { description: 'ZARA', mcc: 5651, min: 900, max: 3600, perWeek: 0.08, hours: [12, 20], weekend: 2 },
  { description: 'Банка «На FPV для 47-ї»', mcc: 4829, min: 100, max: 1000, perWeek: 0.5, hours: [9, 24] },
  { description: 'Нова пошта', mcc: 4215, min: 60, max: 250, perWeek: 0.5, hours: [10, 20] },
]

interface RecurringSpec {
  description: string
  mcc: number
  day: number
  hour: number
  /** UAH; `ago` = months before the current one */
  amount: (ago: number) => number
}

const RECURRING: RecurringSpec[] = [
  { description: 'Олена К.', mcc: 4829, day: 1, hour: 11, amount: () => 18000 },
  { description: 'Sport Life', mcc: 7997, day: 1, hour: 9, amount: () => 1400 },
  { description: 'Spotify', mcc: 5815, day: 3, hour: 4, amount: (ago) => (ago < 4 ? 199 : 169) },
  { description: 'Київстар', mcc: 4814, day: 7, hour: 10, amount: () => 250 },
  { description: 'Netflix', mcc: 5815, day: 12, hour: 3, amount: () => 349 },
  { description: 'Київенерго', mcc: 4900, day: 15, hour: 13, amount: (ago) => 780 + ((ago * 37) % 5) * 90 },
  { description: 'Apple', mcc: 5818, day: 20, hour: 2, amount: () => 49 },
]

export function generateDemo(nowSec: number, seed = 7): { accounts: Account[]; transactions: StoredTx[] } {
  const rnd: Random = mulberry32(seed)
  const transactions: StoredTx[] = []
  let seq = 0

  const push = (accountId: string, time: number, amountKop: number, description: string, mcc: number, cashbackKop = 0) => {
    if (time > nowSec) return
    transactions.push({
      id: `demo-${++seq}`,
      accountId,
      time,
      description,
      mcc,
      hold: nowSec - time < 2 * DAY && rnd() < 0.3,
      amount: amountKop,
      operationAmount: amountKop,
      currencyCode: 980,
      commissionRate: 0,
      cashbackAmount: cashbackKop,
      balance: 0,
    })
  }
  const kop = (uah: number) => Math.round(uah * 100) + (uah >= 50 ? randInt(rnd, 0, 99) : 0)
  const at = (y: number, m: number, d: number, hour: number) => kyivToUnix(y, m, d, hour) + randInt(rnd, 0, 3599)

  const current = monthKey(nowSec)
  const today = kyivParts(nowSec).day

  for (let ago = DEMO_MONTHS - 1; ago >= 0; ago--) {
    const month = addMonths(current, -ago)
    const { year, month: m } = parseMonth(month)
    const lastDay = ago === 0 ? today : daysInMonth(month)

    for (let d = 1; d <= lastDay; d++) {
      const weekday = kyivParts(kyivToUnix(year, m, d, 12)).weekday
      const isWeekend = weekday >= 5
      for (const spec of MERCHANTS) {
        const rate = (spec.perWeek / 7) * (isWeekend ? spec.weekend ?? 1 : 1)
        const count = poisson(rnd, rate)
        for (let i = 0; i < count; i++) {
          const amount = kop(uniform(rnd, spec.min, spec.max))
          const time = at(year, m, d, randInt(rnd, spec.hours[0], spec.hours[1] - 1))
          const cashback = spec.cashback ? Math.round(amount * spec.cashback) : 0
          push(spec.account ?? BLACK, time, -amount, spec.description, spec.mcc, cashback)
        }
      }
    }

    for (const spec of RECURRING) {
      if (spec.day > lastDay) continue
      push(BLACK, at(year, m, spec.day, spec.hour), -spec.amount(ago) * 100, spec.description, spec.mcc)
    }

    // Salary, cashback payout, own transfers
    if (lastDay >= 5) push(BLACK, at(year, m, 5, 10), 7_800_000, 'ТОВ «Софт Дев»', 4829)
    if (lastDay >= 2) push(BLACK, at(year, m, 2, 9), kop(uniform(rnd, 150, 420)), 'Виведення кешбеку', 4829)
    if (lastDay >= 6) {
      const t = at(year, m, 6, 10)
      push(BLACK, t, -300_000, 'На банку «На відпустку»', 4829)
      push(JAR, t + 1, 300_000, 'З чорної картки', 4829)
    }
    if (lastDay >= 20) {
      const t = at(year, m, 20, 18)
      push(BLACK, t, -200_000, 'На білу картку', 4829)
      push(WHITE, t + 2, 200_000, 'З чорної картки', 4829)
    }
    const momDays = poisson(rnd, 0.8)
    for (let i = 0; i < momDays; i++) {
      push(BLACK, at(year, m, randInt(rnd, 1, lastDay), 19), kop(uniform(rnd, 1000, 3000)), 'Від: Мама', 4829)
    }

    // A few memorable one-offs
    if (ago === 5) {
      const t = at(year, m, 14, 12)
      push(JAR, t, -1_000_000, 'На чорну картку', 4829)
      push(BLACK, t + 1, 1_000_000, 'З банки «На відпустку»', 4829)
    }
    if (ago === 3) push(BLACK, at(year, m, 18, 15), 159_900, 'ZARA', 5651)
    if (ago === 2) push(BLACK, at(year, m, 9, 21), -4_299_900, 'Rozetka', 5732)
    if (ago === 0 && today >= 4) push(BLACK, at(year, m, today - 3, 13), -850_000, 'Епіцентр', 5200)
  }

  return { accounts: DEMO_ACCOUNTS, transactions: transactions.sort((a, b) => b.time - a.time) }
}
