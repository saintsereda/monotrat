import { formatUah } from '../../analytics/format'
import { ACCENTS } from '../color'

export interface BarPoint {
  key: string
  label: string
  income: number
  spent: number
}

const W = 720
const H = 250
const PAD = { t: 14, b: 30 }

export function Bars({ points, activeKey }: { points: BarPoint[]; activeKey?: string }) {
  const max = Math.max(1, ...points.flatMap((p) => [p.income, p.spent]))
  const group = W / Math.max(points.length, 1)
  const barW = Math.min(20, group * 0.3)
  const y = (v: number) => PAD.t + (1 - Math.max(v, 0) / max) * (H - PAD.t - PAD.b)
  const h = (v: number) => H - PAD.b - y(v)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Доходи та витрати по місяцях">
      <line x1="0" x2={W} y1={H - PAD.b} y2={H - PAD.b} stroke="#fff" strokeOpacity="0.1" />
      {points.map((p, i) => {
        const cx = group * i + group / 2
        const dim = activeKey && activeKey !== p.key ? 0.45 : 1
        return (
          <g key={p.key} opacity={dim}>
            <title>{`${p.label}: доходи ${formatUah(p.income)}, витрати ${formatUah(p.spent)}`}</title>
            <rect x={cx - barW - 2} y={y(p.income)} width={barW} height={Math.max(h(p.income), 0)} rx="5" fill={ACCENTS.green} />
            <rect x={cx + 2} y={y(p.spent)} width={barW} height={Math.max(h(p.spent), 0)} rx="5" fill={ACCENTS.pink} />
            <text x={cx} y={H - 9} textAnchor="middle" fontSize="12" fill="#fff" fillOpacity={activeKey === p.key ? 0.9 : 0.45} fontWeight="600">
              {p.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
