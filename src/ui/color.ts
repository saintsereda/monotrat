/** `#rrggbb` + alpha → `rgba(...)` */
export function withAlpha(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha.toFixed(3)})`
}

export const ACCENTS = {
  pink: '#ff54bf',
  green: '#7cff6b',
  steel: '#78b7d0',
  mint: '#50ffd8',
  lime: '#6dc106',
  red: '#ff585b',
  emerald: '#2fbe92',
} as const
