import type { ReactNode } from 'react'
import type { DashboardData } from '../../analytics/dashboard'
import { formatCompact, formatUah, monthGenitive, plural } from '../../analytics/format'
import { ratioChange } from '../../analytics/summary'
import { ACCENTS } from '../color'
import { Delta } from '../components/Bits'
import { IconBadge, SectionTitle, Tile, TileHeading } from '../components/Tile'
import { IconIncome, IconTrend } from '../components/icons'
import { LineChart } from '../charts/LineChart'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-white/[0.07] py-2.5 text-[13px]">
      <span className="text-white/55">{label}</span>
      <span className="num text-right text-white">{children}</span>
    </div>
  )
}

function Legend({ color, children, dashed = false }: { color: string; children: ReactNode; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-white/60">
      <span className="h-[3px] w-4 rounded-full" style={{ background: dashed ? `repeating-linear-gradient(90deg, ${color} 0 4px, transparent 4px 7px)` : color }} />
      {children}
    </span>
  )
}

function Compare({ title, base, value }: { title: string; base: number | null; value: number }) {
  return (
    <div className="rounded-3xl bg-icon p-4">
      <div className="text-[12px] font-semibold text-white/50">{title}</div>
      <div className="num mt-2 text-[15px] text-white">{base === null ? '—' : formatUah(base)}</div>
      <div className="mt-1 text-[11px]">
        {base === null ? <span className="text-white/35">ще не завантажено</span> : <Delta ratio={ratioChange(value, base)} suffix="зараз" />}
      </div>
    </div>
  )
}

export function ForecastSection({ data, month }: { data: DashboardData; month: string }) {
  const f = data.forecast
  const c = data.comparison
  const pick = (sameDay: number | null, total: number | null) => (c.isCurrent ? sameDay : total)

  return (
    <section>
      <SectionTitle>{f.isCurrent ? 'Прогноз на кінець місяця' : 'Підсумок місяця'}</SectionTitle>
      <div className="grid gap-3 sm:gap-5 lg:grid-cols-3">
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-1">
          <Tile>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[28px] leading-none font-bold tracking-tight sm:text-[32px]">{formatCompact(f.projected)}</div>
                <div className="mt-2 text-sm font-semibold">{f.isCurrent ? `витрати до кінця ${monthGenitive(month)}` : 'витрачено за місяць'}</div>
                {f.isCurrent && f.high > f.low ? (
                  <div className="num mt-2 text-[12px] text-pink">{formatUah(f.low)} – {formatUah(f.high)}</div>
                ) : null}
              </div>
              <IconBadge color={ACCENTS.pink} small>
                <IconTrend size={22} />
              </IconBadge>
            </div>
            <div className="mt-5">
              <Row label="Уже витрачено">{formatUah(f.spentSoFar)}</Row>
              <Row label="Темп">{formatUah(f.dailyRate)} / день</Row>
              {f.isCurrent ? (
                <>
                  <Row label="Ще регулярні платежі">{formatUah(f.recurringPending)}</Row>
                  <Row label="Лишилось">{f.daysLeft} {plural(f.daysLeft, ['день', 'дні', 'днів'])}</Row>
                </>
              ) : null}
            </div>
          </Tile>
          <Tile>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[28px] leading-none font-bold tracking-tight sm:text-[32px]">{formatCompact(f.incomeProjected)}</div>
                <div className="mt-2 text-sm font-semibold">{f.isCurrent ? 'доходи до кінця місяця' : 'отримано за місяць'}</div>
              </div>
              <IconBadge color={ACCENTS.green} small>
                <IconIncome size={22} />
              </IconBadge>
            </div>
            <div className="mt-5">
              <Row label="Уже отримано">{formatUah(f.incomeSoFar)}</Row>
              {f.isCurrent ? <Row label="Очікуються регулярні">{formatUah(f.incomePending)}</Row> : null}
              <Row label="Середнє за 3 міс">{f.avgIncome3 === null ? '—' : formatUah(f.avgIncome3)}</Row>
            </div>
          </Tile>
        </div>

        <Tile className="lg:col-span-2">
          <TileHeading
            aside={
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                <Legend color={ACCENTS.mint}>цей місяць</Legend>
                <Legend color={ACCENTS.steel}>минулий</Legend>
                <Legend color="#ffffff" dashed>середнє 3 міс</Legend>
              </div>
            }
          >
            Витрати наростаючим підсумком
          </TileHeading>
          <LineChart
            days={c.days}
            series={[
              ...(c.series.avg3 ? [{ id: 'avg3', values: c.series.avg3, color: '#ffffff', dashed: true, opacity: 0.35, width: 1.5 }] : []),
              ...(c.series.previous ? [{ id: 'prev', values: c.series.previous, color: ACCENTS.steel, opacity: 0.85, width: 2 }] : []),
              { id: 'cur', values: c.series.current, color: ACCENTS.mint, width: 3, area: true },
            ]}
            projection={f.isCurrent ? { fromDay: c.elapsedDays, fromValue: c.spentToDate, toValue: f.projected, color: ACCENTS.mint } : null}
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Compare title={c.isCurrent ? 'Минулий місяць на цей день' : 'Минулий місяць'} base={pick(c.prevToSameDay, c.prevTotal)} value={c.spentToDate} />
            <Compare title="Середнє за 3 місяці" base={pick(c.avg3ToSameDay, c.avg3Total)} value={c.spentToDate} />
            <Compare title="Цей самий місяць торік" base={pick(c.lastYearToSameDay, c.lastYearTotal)} value={c.spentToDate} />
          </div>
        </Tile>
      </div>
    </section>
  )
}
