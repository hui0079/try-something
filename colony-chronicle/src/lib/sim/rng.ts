/**
 * mulberry32: 32-bit state, so the whole generator serialises as one number.
 * The world carries `rngState`, which is what makes a save file replay identically.
 */
export class Rng {
  private s: number;

  constructor(state: number) {
    this.s = state >>> 0;
  }

  get state(): number {
    return this.s >>> 0;
  }

  /** Uniform in [0, 1). */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform in [min, max). */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Integer in [0, maxExclusive). */
  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  /** Integer in [min, max] inclusive. */
  intBetween(min: number, max: number): number {
    return min + this.int(max - min + 1);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    return items[this.int(items.length)];
  }

  /** Fisher-Yates on a copy; the input is left alone. */
  shuffled<T>(items: readonly T[]): T[] {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = this.int(i + 1);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  weighted<T>(items: readonly T[], weightOf: (item: T) => number): T | null {
    let total = 0;
    for (const item of items) total += Math.max(0, weightOf(item));
    if (total <= 0) return null;
    let roll = this.next() * total;
    for (const item of items) {
      roll -= Math.max(0, weightOf(item));
      if (roll <= 0) return item;
    }
    return items[items.length - 1];
  }
}

/** FNV-1a, so a memorable seed string maps to a stable 32-bit state. */
export function seedToState(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // A zero state makes mulberry32 start in a dull corner; nudge it off.
  return (h >>> 0) || 0x9e3779b9;
}
