/** Deterministic pseudo-random in [0,1) from an integer seed. */
export function seededRandom(seed) {
  let t = (seed + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

export const lerp = (a, b, t) => a + (b - a) * t

export const formatPct = (v) => `${Math.round(v)}%`
