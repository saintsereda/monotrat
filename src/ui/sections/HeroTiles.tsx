import type { ReactNode } from 'react'
import type { DashboardData } from '../../analytics/dashboard'
import { dayLabel, formatCompact, formatUahExact, monthGenitive } from '../../analytics/format'
import { addMonths, daysInMonth, kyivParts } from '../../analytics/time'
import { ACCENTS } from '../color'
import { Delta } from '../components/Bits'
import { IconBadge, Tile } from '../components/Tile'
import { IconCart, IconGift, IconIncome, IconJar } from '../components/icons'

export function comparisonLabel(month: string, now: number, sameDay: boolean): string {
  const prev = addMonths(month, -1)
  if (!sameDay) return `до ${monthGenitive(prev)}`
  const day = Math.min(kyivParts(now).day, daysInMonth(prev))
  return `до ${dayLabel(`${prev}-${String(day).padStart(2, '0')}`)}`
}

interface HeroSpec {
  label: string
  value: number
  color: string
  icon: ReactNode
  delta: number | null
  upIsGood: boolean
}

export function HeroTiles({ data, month, now }: { data: DashboardData; month: string; now: number }) {
  const { current, deltas, comparedToSameDay } = data.summary
  const suffix = comparisonLabel(month, now, comparedToSameDay)
  const tiles: HeroSpec[] = [
    { label: 'витрачено', value: current.spent, color: ACCENTS.pink, icon: <IconCart />, delta: deltas.spent, upIsGood: false },
    { label: 'отримано', value: current.income, color: ACCENTS.green, icon: <IconIncome />, delta: deltas.income, upIsGood: true },
    { label: 'кешбеку нараховано', value: current.cashback, color: ACCENTS.steel, icon: <IconGift />, delta: deltas.cashback, upIsGood: true },
    { label: 'відкладено в банки', value: current.saved, color: ACCENTS.mint, icon: <IconJar />, delta: deltas.saved, upIsGood: true },
  ]

  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
      {tiles.map((t) => (
        <Tile key={t.label} className="flex min-h-[220px] flex-col sm:min-h-[300px]">
          <IconBadge color={t.color}>{t.icon}</IconBadge>
          <div className="mt-auto pt-8">
            <div className="text-[22px] leading-none font-bold tracking-tight sm:text-[30px]">{formatCompact(t.value)}</div>
            <div className="mt-2 text-[13px] font-semibold sm:text-sm">{t.label}</div>
          </div>
          <div className="num mt-5 truncate text-[12px] sm:text-[14px]" style={{ color: t.color }}>
            {formatUahExact(t.value)}
          </div>
          <div className="mt-1.5 text-[11px] leading-snug sm:text-xs">
            <Delta ratio={t.delta} upIsGood={t.upIsGood} suffix={suffix} />
          </div>
        </Tile>
      ))}
    </div>
  )
}
