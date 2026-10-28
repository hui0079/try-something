const STANDARD_SECONDS = [
  1 / 8000,
  1 / 4000,
  1 / 2000,
  1 / 1000,
  1 / 500,
  1 / 250,
  1 / 125,
  1 / 60,
  1 / 30,
  1 / 15,
  1 / 8,
  1 / 4,
  1 / 2,
  1,
  2,
  4,
]

export function formatF(value: number): string {
  const rounded = Math.round(value * 10) / 10
  if (Number.isInteger(rounded)) return String(rounded)
  return rounded.toFixed(1)
}

export function formatShutter(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—'
  if (seconds >= 1) {
    const rounded = Math.round(seconds * 10) / 10
    return Number.isInteger(rounded) ? `${rounded} 秒` : `${rounded.toFixed(1)} 秒`
  }
  return `1/${Math.max(1, Math.round(1 / seconds))}`
}

export function safeShutterDenom(focalLength: number, cropFactor: number): number {
  return Math.max(1, Math.ceil(focalLength * cropFactor))
}

export function fastestSafeStandard(limitSeconds: number): number {
  const safe = STANDARD_SECONDS.filter((speed) => speed <= limitSeconds + 1e-9)
  return safe.at(-1) ?? STANDARD_SECONDS[0]!
}
