import type { CSSProperties, ReactNode } from 'react'

export function Tile({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`tile p-5 sm:p-7 ${className}`} style={style}>
      {children}
    </div>
  )
}

export function IconBadge({ children, color, small = false }: { children: ReactNode; color: string; small?: boolean }) {
  return (
    <div
      className={`grid shrink-0 place-items-center bg-icon ${small ? 'size-10 rounded-xl' : 'size-12 rounded-2xl sm:size-[72px] sm:rounded-[20px]'}`}
      style={{ color }}
    >
      {children}
    </div>
  )
}

export function TileHeading({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-[15px] font-semibold text-white">{children}</h3>
      {aside}
    </div>
  )
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mt-14 mb-4 flex flex-wrap items-end justify-between gap-3 sm:mt-20 sm:mb-5">
      <h2 className="text-[22px] font-bold tracking-tight sm:text-[26px]">{children}</h2>
      {aside}
    </div>
  )
}

export function Pending({ children = 'Дозавантажуємо історію…' }: { children?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-sm text-white/50">
      <span className="size-2 animate-pulse rounded-full bg-mint" />
      {children}
    </div>
  )
}

export function Rank({ n }: { n: number }) {
  return <span className="num w-7 shrink-0 text-[13px] text-white/35">{String(n).padStart(2, '0')}</span>
}
