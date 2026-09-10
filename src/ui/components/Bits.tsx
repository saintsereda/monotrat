import { Component, type ReactNode } from 'react'
import { formatDelta } from '../../analytics/format'

export function Avatar({ label, color, size = 28 }: { label: string; color: string; size?: number }) {
  const letter = (label.trim().match(/[\p{L}\p{N}]/u)?.[0] ?? '•').toUpperCase()
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full font-bold text-black"
      style={{ width: size, height: size, background: color, fontSize: Math.round(size * 0.42) }}
    >
      {letter}
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
