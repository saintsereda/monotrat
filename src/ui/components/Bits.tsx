import { Component, type ReactNode, useState } from 'react'
import { CATEGORIES } from '../../analytics/categories'
import { formatDelta } from '../../analytics/format'
import type { CategoryId } from '../../analytics/types'
import { useMerchantLogos } from '../../logos/useMerchantLogo'
import { withAlpha } from '../color'

/** Merchant logo; without one — the category icon, or the first letter for uncategorised merchants. */
export function Avatar({ label, category, size = 28 }: { label: string; category: CategoryId; size?: number }) {
  const sources = useMerchantLogos(label, category)
  const [failed, setFailed] = useState<readonly string[]>([])
  const logo = sources.find((src) => !failed.includes(src))
  const meta = CATEGORIES[category]
  const box = { width: size, height: size }

  if (logo) {
    return (
      <img
        src={logo}
        alt=""
        aria-hidden
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed((list) => [...list, logo])}
        className="shrink-0 rounded-full bg-white object-cover"
        style={box}
      />
    )
  }
  if (category === 'other') {
    const letter = (label.trim().match(/[\p{L}\p{N}]/u)?.[0] ?? '•').toUpperCase()
    return (
      <span
        aria-hidden
        className="grid shrink-0 place-items-center rounded-full font-bold text-black"
        style={{ ...box, background: meta.color, fontSize: Math.round(size * 0.42) }}
      >
        {letter}
      </span>
    )
  }
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full"
      style={{ ...box, background: withAlpha(meta.color, 0.2), fontSize: Math.round(size * 0.5) }}
    >
      {meta.emoji}
    </span>
  )
}

/** ▲/▼ change; `upIsGood` picks the color semantics (income up = good, spending up = bad). */
export function Delta({ ratio, upIsGood = false, suffix }: { ratio: number | null; upIsGood?: boolean; suffix?: string }) {
  if (ratio === null) return <span className="text-white/40">немає даних для порівняння</span>
  const flat = Math.abs(ratio) < 0.005
  const up = ratio > 0
  const tone = flat ? 'text-white/50' : up === upIsGood ? 'text-green' : 'text-red'
  return (
    <span className={tone}>
      {flat ? '=' : up ? '▲' : '▼'} {formatDelta(Math.abs(ratio)).replace('+', '')}
      {suffix ? <span className="text-white/45"> {suffix}</span> : null}
    </span>
  )
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error(error)
  }

  render() {
    if (this.state.failed) {
      return <div className="tile p-6 text-sm text-white/60">Цей блок не вдалося показати. Решта дашборду працює.</div>
    }
    return this.props.children
  }
}
