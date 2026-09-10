import { type PieArcDatum, arc, pie } from 'd3-shape'
import type { ReactNode } from 'react'

export interface DonutItem {
  id: string
  value: number
}

export function Donut({
  items, activeId, onSelect, size = 300, children,
}: {
  items: DonutItem[]
  activeId: string | null
  onSelect: (id: string) => void
  size?: number
  children?: ReactNode
}) {
  const r = size / 2 - 14
  const inner = r * 0.56
  const arcs = pie<DonutItem>().value((d) => d.value).sort(null).padAngle(0.008)(items)
  const base = arc<PieArcDatum<DonutItem>>().innerRadius(inner).outerRadius(r).cornerRadius(2)
  const lifted = arc<PieArcDatum<DonutItem>>().innerRadius(inner - 2).outerRadius(r + 12).cornerRadius(3)
  const ordered = [...arcs].sort((a, b) => Number(a.data.id === activeId) - Number(b.data.id === activeId))

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} width={size} height={size} className="overflow-visible">
        <defs>
          <filter id="donut-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="9" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="donut-active" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#45e3b1" />
            <stop offset="1" stopColor="#1f9c74" />
          </linearGradient>
        </defs>
        <circle r={r + 1} fill="#0a1712" />
        <circle r={inner - 1} fill="#06110d" />
        {ordered.map((a) => {
          const active = a.data.id === activeId
          return (
            <path
              key={a.data.id}
              d={(active ? lifted : base)(a) ?? ''}
              fill={active ? 'url(#donut-active)' : '#152b23'}
              stroke="#000"
              strokeWidth={active ? 0 : 1}
              filter={active ? 'url(#donut-glow)' : undefined}
              className="cursor-pointer transition-[fill] duration-200 hover:fill-[#1c3a2f]"
              onMouseEnter={() => onSelect(a.data.id)}
              onClick={() => onSelect(a.data.id)}
            />
          )
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}
