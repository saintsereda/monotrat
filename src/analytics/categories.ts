import type { CategoryId } from './types'

export interface CategoryMeta {
  id: CategoryId
  label: string
  emoji: string
  color: string
}

const meta = (id: CategoryId, label: string, emoji: string, color: string): CategoryMeta => ({ id, label, emoji, color })

export const CATEGORIES: Record<CategoryId, CategoryMeta> = {
  groceries: meta('groceries', 'Продукти та супермаркети', '🛒', '#ff9a3c'),
  cafe: meta('cafe', 'Кафе та ресторани', '🍔', '#a78bfa'),
  taxi: meta('taxi', 'Таксі', '🚕', '#facc15'),
  travel: meta('travel', 'Подорожі й транспорт', '✈️', '#2fbe92'),
  entertainment: meta('entertainment', 'Розваги та спорт', '🎳', '#50ffd8'),
  cinema: meta('cinema', 'Кіно', '🎬', '#fb7185'),
  digital: meta('digital', 'Цифрові сервіси', '📱', '#38bdf8'),
  health: meta('health', "Краса та здоров'я", '💊', '#ff54bf'),
  utilities: meta('utilities', 'Комуналка та інтернет', '💡', '#60a5fa'),
  mobile: meta('mobile', 'Поповнення мобільного', '📶', '#78b7d0'),
  auto: meta('auto', 'Авто', '⛽', '#a3a3a3'),
  clothes: meta('clothes', 'Одяг та взуття', '👟', '#ff585b'),
  home: meta('home', 'Ремонт і дім', '🔨', '#f97316'),
  electronics: meta('electronics', 'Техніка', '💻', '#818cf8'),
  shopping: meta('shopping', 'Покупки', '🛍️', '#e879f9'),
  pets: meta('pets', 'Тварини', '🐾', '#fbbf24'),
  education: meta('education', 'Освіта', '🎓', '#34d399'),
  books: meta('books', 'Книги', '📚', '#c084fc'),
  taxes: meta('taxes', 'Бюджет та податки', '🏛️', '#94a3b8'),
  finance: meta('finance', 'Фінанси та страхування', '🏦', '#5eead4'),
  cash: meta('cash', 'Готівка', '💵', '#7cff6b'),
  transfers: meta('transfers', 'Перекази', '↗️', '#6dc106'),
  payments: meta('payments', 'Платежі й послуги', '🧾', '#f59e0b'),
  donations: meta('donations', 'Донати', '💙', '#3b82f6'),
  dutyfree: meta('dutyfree', 'Duty Free', '🧳', '#fcd34d'),
  other: meta('other', 'Інше', '•', '#8b8b8b'),
}

const RANGES: ReadonlyArray<readonly [number, number, CategoryId]> = [
  [742, 742, 'pets'],
  [1520, 1799, 'home'],
  [3000, 3999, 'travel'],
  [4111, 4112, 'travel'], [4121, 4121, 'taxi'], [4131, 4131, 'travel'], [4411, 4411, 'travel'],
  [4511, 4511, 'travel'], [4582, 4582, 'travel'], [4722, 4722, 'travel'], [4789, 4789, 'travel'],
  [4812, 4812, 'electronics'], [4814, 4814, 'mobile'], [4816, 4816, 'utilities'], [4829, 4829, 'transfers'],
  [4899, 4899, 'utilities'], [4900, 4900, 'utilities'],
  [5045, 5045, 'electronics'], [5065, 5065, 'electronics'], [5122, 5122, 'health'],
  [5137, 5137, 'clothes'], [5139, 5139, 'clothes'], [5192, 5192, 'books'],
  [5200, 5200, 'home'], [5211, 5211, 'home'], [5231, 5231, 'home'], [5251, 5251, 'home'], [5261, 5261, 'home'],
  [5300, 5300, 'groceries'], [5309, 5309, 'dutyfree'], [5310, 5311, 'shopping'], [5331, 5331, 'shopping'], [5399, 5399, 'shopping'],
  [5411, 5411, 'groceries'], [5422, 5422, 'groceries'], [5441, 5441, 'groceries'], [5451, 5451, 'groceries'],
  [5462, 5462, 'groceries'], [5499, 5499, 'groceries'],
  [5511, 5511, 'auto'], [5521, 5521, 'auto'], [5531, 5533, 'auto'], [5541, 5542, 'auto'], [5571, 5571, 'auto'],
  [5611, 5699, 'clothes'], [5712, 5719, 'home'],
  [5722, 5722, 'electronics'], [5732, 5732, 'electronics'], [5734, 5734, 'electronics'],
  [5811, 5814, 'cafe'], [5815, 5818, 'digital'], [5912, 5912, 'health'],
  [5940, 5941, 'entertainment'], [5942, 5942, 'books'], [5944, 5945, 'shopping'], [5946, 5946, 'electronics'],
  [5947, 5947, 'shopping'], [5948, 5948, 'clothes'], [5964, 5964, 'shopping'], [5969, 5969, 'shopping'],
  [5977, 5977, 'health'], [5983, 5983, 'auto'], [5992, 5992, 'shopping'], [5994, 5994, 'books'],
  [5995, 5995, 'pets'], [5999, 5999, 'shopping'],
  [6010, 6011, 'cash'], [6012, 6012, 'finance'], [6051, 6051, 'finance'], [6211, 6211, 'finance'],
  [6300, 6300, 'finance'], [6381, 6381, 'finance'], [6399, 6399, 'finance'],
  [6536, 6540, 'transfers'],
  [7011, 7011, 'travel'], [7230, 7230, 'health'], [7297, 7298, 'health'], [7372, 7372, 'digital'],
  [7512, 7512, 'travel'], [7523, 7523, 'auto'], [7531, 7549, 'auto'],
  [7832, 7832, 'cinema'], [7841, 7841, 'cinema'],
  [7922, 7922, 'entertainment'], [7929, 7929, 'entertainment'], [7932, 7933, 'entertainment'],
  [7941, 7941, 'entertainment'], [7991, 7999, 'entertainment'],
  [8011, 8099, 'health'], [8211, 8299, 'education'], [8398, 8398, 'donations'], [8661, 8661, 'donations'],
  [9211, 9402, 'taxes'],
]

export function categoryForMcc(mcc: number): CategoryId {
  for (const [from, to, id] of RANGES) {
    if (mcc >= from && mcc <= to) return id
  }
  return 'other'
}

export const TRANSFER_MCCS: ReadonlySet<number> = new Set([4829, 6536, 6537, 6538, 6539, 6540])

/** Positive amounts in these categories are income, not refunds. */
export const NON_MERCHANT_CATEGORIES: ReadonlySet<CategoryId> = new Set<CategoryId>(['transfers', 'cash', 'finance', 'other'])
