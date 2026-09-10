import type { DashboardData } from '../../analytics/dashboard'
import { dayLabel, formatUah, plural } from '../../analytics/format'
import { ACCENTS } from '../color'
import { SectionTitle, Tile, TileHeading } from '../components/Tile'
import { MonthHeatmap, WeekHourHeatmap } from '../charts/Heatmaps'

const DAY_FORMS: [string, string, string] = ['день', 'дні', 'днів']

export function CalendarSection({ data }: { data: DashboardData }) {
  const { weekdayAvg, weekendAvg } = data.weekdayWeekend
  const ratio = weekdayAvg > 0 ? weekendAvg / weekdayAvg : null
  const weekendNote =
    ratio === null ? 'Ще мало даних'
      : ratio >= 1.2 ? `На вихідних витрачаєте в ${ratio.toFixed(1).replace('.', ',')} раза більше`
        : ratio <= 0.8 ? 'Вихідні у вас економніші за будні'
          : 'Будні й вихідні приблизно однакові'

  return (
    <section>
      <SectionTitle>Календар і ритми</SectionTitle>
      <div className="grid gap-3 sm:gap-5 lg:grid-cols-3">
        <Tile className="lg:col-span-2">
          <TileHeading>Витрати по днях</TileHeading>
          <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_230px]">
            <MonthHeatmap days={data.days} color={ACCENTS.mint} />
            <div>
              <div className="mb-3 text-[12px] font-semibold text-white/45">Найвитратніші дні</div>
              <ol className="space-y-3.5">
                {data.topDays.map((d, i) => (
                  <li key={d.date}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[13px] font-semibold">
                        <span className="num mr-2 text-white/35">{String(i + 1).padStart(2, '0')}</span>
                        {dayLabel(d.date)}
                      </span>
                      <span className="num text-[13px] text-mint">{formatUah(d.amount)}</span>
                    </div>
                    <div className="mt-0.5 truncate pl-7 text-[12px] text-white/45">{d.top.map((t) => t.label).join(' · ')}</div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Tile>
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-1">
          <Tile>
            <div className="text-[12px] font-semibold text-white/50">Середній день</div>
            <div className="mt-3 flex items-end gap-6">
              <div>
                <div className="num text-[18px] text-steel">{formatUah(weekdayAvg)}</div>
                <div className="mt-1 text-[12px] font-semibold">будній</div>
              </div>
              <div>
                <div className="num text-[18px] text-pink">{formatUah(weekendAvg)}</div>
                <div className="mt-1 text-[12px] font-semibold">вихідний</div>
              </div>
            </div>
            <div className="mt-3 text-[12px] text-white/45">{weekendNote}</div>
          </Tile>
          <Tile>
            <div className="text-[12px] font-semibold text-white/50">Днів без витрат</div>
            <div className="mt-3 text-[30px] leading-none font-bold">
              {data.noSpend.count}
              <span className="text-[15px] text-white/40"> з {data.noSpend.elapsedDays}</span>
            </div>
            <div className="mt-2 text-[12px] text-white/45">жодної покупки за весь день</div>
          </Tile>
          <Tile>
            <div className="text-[12px] font-semibold text-white/50">Найдовша серія</div>
            <div className="mt-3 text-[30px] leading-none font-bold text-lime">
              {data.noSpend.longestStreak}
              <span className="text-[15px] text-white/40"> {plural(data.noSpend.longestStreak, DAY_FORMS)}</span>
            </div>
            <div className="mt-2 text-[12px] text-white/45">поспіль без витрат</div>
          </Tile>
        </div>
      </div>
      <Tile className="mt-3 sm:mt-5">
        <TileHeading aside={<span className="text-[12px] text-white/40">за весь завантажений період</span>}>Коли ви витрачаєте</TileHeading>
        <WeekHourHeatmap data={data.weekHour} color={ACCENTS.pink} />
      </Tile>
    </section>
  )
}
