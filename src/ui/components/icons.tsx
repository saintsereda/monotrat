import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 28, children, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...rest}>
      {children}
    </svg>
  )
}

export const IconCart = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 4h2.2l2.2 10.1a1.2 1.2 0 0 0 1.2.9h8.6a1.2 1.2 0 0 0 1.2-.9L20.2 7.5H6" />
    <circle cx="9.5" cy="19.5" r="1.3" fill="currentColor" />
    <circle cx="17" cy="19.5" r="1.3" fill="currentColor" />
  </Svg>
)

export const IconIncome = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="15" rx="4" fill="currentColor" stroke="none" />
    <path d="M12 8.5v6.5m0 0-3-3m3 3 3-3" stroke="#161616" />
  </Svg>
)

export const IconGift = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="8" width="17" height="4" rx="1.2" fill="currentColor" stroke="none" />
    <rect x="5" y="12" width="14" height="8.5" rx="2" fill="currentColor" stroke="none" />
    <path d="M12 8v12.5" stroke="#161616" />
    <path d="M12 8c-1.5-3.2-5.5-3.5-5.5-1S10 8 12 8Zm0 0c1.5-3.2 5.5-3.5 5.5-1S14 8 12 8Z" />
  </Svg>
)

export const IconJar = (p: IconProps) => (
  <Svg {...p}>
    <rect x="7" y="3.5" width="10" height="3.5" rx="1.2" fill="currentColor" stroke="none" />
    <path d="M6 9.5a2.5 2.5 0 0 1 2.5-2.5h7A2.5 2.5 0 0 1 18 9.5V18a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 6 18Z" fill="currentColor" stroke="none" />
    <path d="M9.5 13.5h5" stroke="#161616" />
  </Svg>
)

export const IconTrend = (p: IconProps) => (
  <Svg {...p}>
    <path d="m4 17 5-5 4 4 7-7" />
    <path d="M14.5 9H20v5.5" />
  </Svg>
)

export const IconWallet = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="5.5" width="17" height="14" rx="4" fill="currentColor" stroke="none" />
    <rect x="13" y="10.5" width="7.5" height="4.5" rx="2.2" fill="#161616" stroke="none" />
    <circle cx="16" cy="12.75" r="1" fill="currentColor" stroke="none" />
  </Svg>
)

export const IconRepeat = (p: IconProps) => (
  <Svg {...p}>
    <path d="M17 3.5 20 6.5l-3 3" />
    <path d="M4 11.5v-1a4 4 0 0 1 4-4h12" />
    <path d="M7 20.5 4 17.5l3-3" />
    <path d="M20 12.5v1a4 4 0 0 1-4 4H4" />
  </Svg>
)

export const IconAlert = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10.3 4.3 2.9 17.2A2 2 0 0 0 4.6 20h14.8a2 2 0 0 0 1.7-2.8L13.7 4.3a2 2 0 0 0-3.4 0Z" fill="currentColor" stroke="none" />
    <path d="M12 9.5v4M12 16.8v.2" stroke="#161616" />
  </Svg>
)

export const IconCalendar = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="4" fill="currentColor" stroke="none" />
    <path d="M8 3v4M16 3v4M3.5 10h17" stroke="#161616" />
  </Svg>
)

export const IconSpark = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5 14 10l6.5 2-6.5 2-2 6.5-2-6.5-6.5-2 6.5-2Z" fill="currentColor" stroke="none" />
  </Svg>
)

export const IconLock = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4.5" y="10" width="15" height="10.5" rx="3" fill="currentColor" stroke="none" />
    <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
  </Svg>
)
