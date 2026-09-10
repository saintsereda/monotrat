import { curveMonotoneX, line } from 'd3-shape'
import { formatCompact } from '../../analytics/format'

export interface LineSeries {
  id: string
  values: number[]
  color: string
  width?: number
  dashed?: boolean
  opacity?: number
  area?: boolean
}

const W = 680
const PAD = { l: 6, r: 10, t: 18, b: 30 }

export function LineChart({
  series, days, projection, height = 260,
}: {
  series: LineSeries[]
  days: number
  projection?: { fromDay: number; fromValue: number; toValue: number; color: string } | null
  height?: number
}) {
  const H = height
  const max = Math.max(1, ...series.flatMap((s) => s.values), projection?.toValue ?? 0) * 1.1
  const x = (day: number) => PAD.l + ((day - 1) / Math.max(days - 1, 1)) * (W - PAD.l - PAD.r)
  const y = (v: number) => PAD.t + (1 - Math.max(v, 0) / max) * (H - PAD.t - PAD.b)
  const toPath = line<number>().x((_, i) => x(i + 1)).y((v) => y(v)).curve(curveMonotoneX)
  const ticks = [1, 8, 15, 22, days]
  const grid = [0.25, 0.5, 0.75].map((f) => max * f)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Накопичені витрати по днях місяця">
      <defs>
        {series.filter((s) => s.area).map((s) => (
          <linearGradient key={s.id} id={`area-${s.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={s.color} stopOpacity="0.28" />
            <stop offset="1" stopColor={s.color} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>
      {grid.map((v) => (
        <g key={v}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="#fff" strokeOpacity="0.07" />
          <text x={W - PAD.r} y={y(v) - 6} textAnchor="end" fontSize="11" fill="#fff" fillOpacity="0.35" fontFamily="Roboto Mono, monospace">
            {formatCompact(v)}
          </text>
        </g>
      ))}
      {series.map((s) =>
        s.values.length ? (
          <g key={s.id}>
            {s.area && s.values.length > 1 ? (
              <path
                d={`${toPath(s.values)}L${x(s.values.length)},${y(0)}L${x(1)},${y(0)}Z`}
                fill={`url(#area-${s.id})`}
              />
            ) : null}
            <path
              d={toPath(s.values) ?? ''}
              fill="none"
              stroke={s.color}
              strokeWidth={s.width ?? 2}
              strokeOpacity={s.opacity ?? 1}
              strokeDasharray={s.dashed ? '5 6' : undefined}
              strokeLinecap="round"
            />
          </g>
        ) : null,
      )}
      {projection ? (
        <g>
          <line
            x1={x(projection.fromDay)} y1={y(projection.fromValue)} x2={x(days)} y2={y(projection.toValue)}
            stroke={projection.color} strokeWidth="2.5" strokeDasharray="2 7" strokeLinecap="round"
          />
          <circle cx={x(days)} cy={y(projection.toValue)} r="4.5" fill="#000" stroke={projection.color} strokeWidth="2.5" />
          <circle cx={x(projection.fromDay)} cy={y(projection.fromValue)} r="5" fill={projection.color} />
        </g>
      ) : null}
      {ticks.map((d) => (
        <text key={d} x={x(d)} y={H - 8} textAnchor={d === 1 ? 'start' : d === days ? 'end' : 'middle'} fontSize="11" fill="#fff" fillOpacity="0.4" fontFamily="Roboto Mono, monospace">
          {d}
        </text>
      ))}
    </svg>
  )
}
