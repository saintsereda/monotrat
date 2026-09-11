import { CATEGORIES } from '../../analytics/categories'
import type { DashboardData } from '../../analytics/dashboard'
import { dayLabel, formatUah } from '../../analytics/format'
import { dayKey } from '../../analytics/time'
import { Avatar } from '../components/Bits'
import { Rank, SectionTitle, Tile, TileHeading } from '../components/Tile'

const times = (ratio: number) => `у ${ratio.toFixed(1).replace('.', ',')} раза`

export function AnomaliesSection({ data }: { data: DashboardData }) {
  const nothing = !data.unusualTxs.length && !data.unusualDays.length && !data.spikes.length

  return (
    <section>
      <SectionTitle>Незвичне й великі покупки</SectionTitle>
      <div className="grid gap-3 sm:gap-5 lg:grid-cols-2">
        <Tile>
          <TileHeading>Що вибивається зі звичного</TileHeading>
          {nothing ? (
            <p className="text-[13px] text-white/55">✨ Нічого незвичного — усе в межах ваших звичок.</p>
          ) : (
            <ul className="space-y-4">
              {data.spikes.map((s) => (
                <li key={s.id} className="flex gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-red/15 text-[16px]">{CATEGORIES[s.id].emoji}</span>
                  <span className="text-[13px] leading-snug">
                    <span className="font-semibold">{CATEGORIES[s.id].label}</span>
                    <span className="text-white/55">: уже {formatUah(s.amount)} — {times(s.ratio)} більше, ніж зазвичай на цей момент місяця</span>
                  </span>
                </li>
              ))}
              {data.unusualTxs.map((u) => (
                <li key={u.tx.id} className="flex gap-3">
                  <Avatar label={u.tx.description} category={u.tx.category} size={36} />
                  <span className="min-w-0 flex-1 text-[13px] leading-snug">
                    <span className="block truncate font-semibold">{u.tx.description}</span>
                    <span className="text-white/55">
                      {dayLabel(dayKey(u.tx.time))} · {u.ratio > 0 ? `${times(u.ratio)} більше звичного чека` : 'рідкісна велика покупка'}
                    </span>
                  </span>
                  <span className="num shrink-0 text-[13px] text-red">{formatUah(-u.tx.amountUah)}</span>
                </li>
              ))}
              {data.unusualDays.slice(0, 3).map((d) => (
                <li key={d.date} className="flex gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-pink/15 text-[16px]">📆</span>
                  <span className="min-w-0 flex-1 text-[13px] leading-snug">
                    <span className="font-semibold">{dayLabel(d.date)}</span>
                    <span className="text-white/55"> — дорогий день, зазвичай ~{formatUah(d.median)}</span>
                  </span>
                  <span className="num shrink-0 text-[13px] text-pink">{formatUah(d.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Tile>
        <Tile>
          <TileHeading>Найбільші покупки</TileHeading>
          {data.biggest.length ? (
            <ol>
              {data.biggest.map((t, i) => (
                <li key={t.id} className="flex items-center gap-3 py-[7px]">
                  <Rank n={i + 1} />
                  <Avatar label={t.description} category={t.category} size={24} />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{t.description}</span>
                  <span className="hidden text-[12px] text-white/40 sm:inline">{dayLabel(dayKey(t.time))}</span>
                  <span className="num w-[92px] shrink-0 text-right text-[13px]">{formatUah(-t.amountUah)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[13px] text-white/50">Покупок цього місяця ще немає.</p>
          )}
        </Tile>
      </div>
    </section>
  )
}
