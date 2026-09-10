export type Random = () => number

/** Small deterministic PRNG so the demo looks the same on every visit. */
export function mulberry32(seed: number): Random {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const uniform = (rnd: Random, min: number, max: number) => min + (max - min) * rnd()

export const randInt = (rnd: Random, min: number, max: number) => Math.floor(uniform(rnd, min, max + 1))

/** Knuth's algorithm; fine for the small rates used here. */
export function poisson(rnd: Random, lambda: number): number {
  const limit = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k++
    p *= rnd()
  } while (p > limit)
  return k - 1
}
