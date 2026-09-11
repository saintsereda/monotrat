import { useState } from 'react'
import { CATEGORIES } from '../../analytics/categories'
import type { DashboardData } from '../../analytics/dashboard'
import { formatUah, plural } from '../../analytics/format'
import { type MerchantStat, topMerchants } from '../../analytics/merchants'
import { Avatar } from '../components/Bits'
import { Rank, SectionTitle, Tile, TileHeading } from '../components/Tile'
import { Segmented } from '../components/Segmented'

function MerchantRow({ n, m, value }: { n: number; m: MerchantStat; value: string }) {
  return (
    <li className="flex items-center gap-3 py-[7px]">
      <Rank n={n} />
      <Avatar label={m.label} category={m.category} size={24} />
      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{m.label}</span>
      <span className="num shrink-0 text-[13px]">{value}</span>
    </li>
  )
}

function CardHeader({ emoji, color, title }: { emoji: string; color: string; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="grid size-9 place-items-center rounded-full text-[17px]" style={{ background: color }}>
        {emoji}
      </span>
      <span className="truncate text-[14px] font-semibold" style={{ color }}>
        {title}
      </span>
    </div>
  )
}

export function MerchantsSection({ data }: { data: DashboardData }) {
  const [by, setBy] = useState<'amount' | 'count'>('amount')
  const top = topMerchants(data.merchants, by)
  const frequent = data.merchants
    .filter((m) => m.everyDays !== null)
    .sort((a, b) => (a.everyDays ?? 0) - (b.everyDays ?? 0))
    .slice(0, 5)

  return (
    <section>
      <SectionTitle
        aside={
          <Segmented
            label="Сортування мерчантів"
            value={by}
            onChange={setBy}
            options={[{ value: 'amount', label: 'Сума' }, { value: 'count', label: 'Кількість операцій' }]}
          />
        }
      >
        Топ-10 мерчантів
      </SectionTitle>
      {data.merchants.length ? (
        <div className="grid gap-3 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
          <Tile className="!p-6">
            <CardHeader emoji="🏆" color="#ff54bf" title={by === 'amount' ? 'За сумою' : 'За кількістю'} />
            <ol>
              {top.map((m, i) => (
                <MerchantRow key={m.key} n={i + 1} m={m} value={by === 'amount' ? formatUah(m.amount) : String(m.count)} />
              ))}
            </ol>
          </Tile>
          {data.byCategory.slice(0, 5).map((group) => {
            const meta = CATEGORIES[group.category]
            return (
              <Tile key={group.category} className="!p-6">
                <CardHeader emoji={meta.emoji} color={meta.color} title={meta.label} />
                <ol>
                  {group.items.map((m, i) => (
                    <MerchantRow key={m.key} n={i + 1} m={m} value={formatUah(m.amount)} />
                  ))}
                </ol>
              </Tile>
            )
          })}
        </div>
      ) : (
        <Tile>
          <p className="text-sm text-white/55">Цього місяця покупок у мерчантів ще немає.</p>
        </Tile>
      )}

      <div className="mt-3 grid gap-3 sm:mt-5 sm:gap-5 md:grid-cols-2">
        <Tile>
          <TileHeading>Нові місця цього місяця</TileHeading>
          {data.newMerchants.length ? (
            <div className="flex flex-wrap gap-2">
              {data.newMerchants.slice(0, 12).map((m) => (
                <span key={m.key} className="inline-flex items-center gap-2 rounded-full bg-icon py-1.5 pr-3 pl-1.5 text-[12px] font-semibold">
                  <Avatar label={m.label} category={m.category} size={22} />
                  {m.label}
                  <span className="num text-white/45">{formatUah(m.amount)}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-white/50">Нових місць немає — або ще вантажимо попередній місяць.</p>
          )}
        </Tile>
        <Tile>
          <TileHeading>Куди ходите найчастіше</TileHeading>
          {frequent.length ? (
            <ul>
              {frequent.map((m) => {
                const days = Math.max(1, Math.round(m.everyDays ?? 1))
                return (
                  <li key={m.key} className="flex items-center gap-3 py-[7px]">
                    <Avatar label={m.label} category={m.category} size={24} />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{m.label}</span>
                    <span className="text-[12px] text-white/55">раз на {days} {plural(days, ['день', 'дні', 'днів'])}</span>
                    <span className="num w-[84px] shrink-0 text-right text-[13px]">~{formatUah(m.avgCheck)}</span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-[13px] text-white/50">Потрібно трохи більше історії.</p>
          )}
        </Tile>
      </div>
    </section>
  )
}
