export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

/** Maps value into 0..1 against a ceiling, saturating above it. */
export function ratio(value: number, ceiling: number): number {
  if (ceiling <= 0) return 0;
  return clamp01(value / ceiling);
}

/** How badly `have` falls short of `want`, as 0..1. */
export function shortfall(have: number, want: number): number {
  if (want <= 0) return 0;
  return clamp01((want - have) / want);
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}
