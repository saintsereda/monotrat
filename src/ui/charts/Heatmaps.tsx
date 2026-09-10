import type { DayCell, WeekHour } from '../../analytics/calendar'
import { WEEKDAYS_SHORT, dayLabel, formatUah } from '../../analytics/format'
import { withAlpha } from '../color'

const intensity = (value: number, max: number) => (value > 0 ? 0.16 + 0.84 * Math.pow(value / max, 0.7) : 0)

export function MonthHeatmap({ days, color }: { days: DayCell[]; color: string }) {
  const max = Math.max(1, ...days.map((d) => d.amount))
  const offset = days[0]?.weekday ?? 0
  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold text-white/35">
        {WEEKDAYS_SHORT.map((w) => <div key={w}>{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: offset }, (_, i) => <div key={`empty-${i}`} />)}
        {days.map((d) => {
          const a = d.isFuture ? 0 : intensity(d.amount, max)
          const style = a > 0 ? { background: withAlpha(color, a) } : undefined
          const tone = d.isFuture ? 'border border-white/[0.06]' : a > 0 ? '' : 'bg-icon'
          return (
            <div
              key={d.date}
              title={d.isFuture ? dayLabel(d.date) : `${dayLabel(d.date)}: ${formatUah(d.amount)}`}
              className={`relative aspect-square rounded-[10px] ${tone}`}
              style={style}
            >
              <span className={`absolute top-1 left-1.5 text-[10px] font-semibold ${a > 0.55 ? 'text-black/70' : 'text-white/40'}`}>{d.day}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function WeekHourHeatmap({ data, color }: { data: WeekHour; color: string }) {
  const max = Math.max(1, ...data.amount.flat())
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[520px] grid-cols-[28px_repeat(24,minmax(0,1fr))] gap-[3px]">
        {data.amount.map((row, weekday) => (
          <div key={weekday} className="contents">
            <div className="self-center text-[11px] font-semibold text-white/35">{WEEKDAYS_SHORT[weekday]}</div>
            {row.map((value, hour) => {
              const a = intensity(value, max)
              return (
                <div
                  key={hour}
                  title={`${WEEKDAYS_SHORT[weekday]}, ${hour}:00 — ${formatUah(value)} · ${data.count[weekday][hour]} опер.`}
                  className={`aspect-square rounded-[4px] ${a > 0 ? '' : 'bg-icon'}`}
                  style={a > 0 ? { background: withAlpha(color, a) } : undefined}
                />
              )
            })}
          </div>
        ))}
        <div />
        {Array.from({ length: 24 }, (_, hour) => (
          <div key={hour} className="num pt-1 text-center text-[10px] text-white/30">
            {hour % 6 === 0 ? hour : ''}
          </div>
        ))}
      </div>
    </div>
  )
}
