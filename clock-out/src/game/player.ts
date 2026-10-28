export const PHYS = {
  speed: 108,
  jumpSpeed: -380,
  gravity: 1100,
  dashSpeed: 400,
  dashMs: 200,
  dashCooldownMs: 700,
  coyoteMs: 110,
  jumpBufferMs: 120,
  invulnMs: 900,
  stompBounce: -260,
} as const

export const XP_GATES = [0, 12, 30, 54] as const
export const HEART_MAX = 30

export function jumpHeight(): number {
  return (PHYS.jumpSpeed * PHYS.jumpSpeed) / (2 * PHYS.gravity)
}

export function jumpDistance(): number {
  const air = (2 * Math.abs(PHYS.jumpSpeed)) / PHYS.gravity
  return PHYS.speed * air
}

export function dashJumpDistance(): number {
  const air = (2 * Math.abs(PHYS.jumpSpeed)) / PHYS.gravity
  const dashT = Math.min(PHYS.dashMs / 1000, air)
  return PHYS.dashSpeed * dashT + PHYS.speed * (air - dashT)
}

export function levelFor(xp: number): number {
  let level = 1
  for (let i = 1; i < XP_GATES.length; i++) if (xp >= XP_GATES[i]) level = i + 1
  return level
}

export function maxHp(level: number): number {
  return 4 + level - 1
}

export function swordDamage(level: number): number {
  return level
}

export function xpSpan(level: number): { have: number; next: number } {
  const index = Math.min(level, XP_GATES.length) - 1
  const floor = XP_GATES[index] ?? 0
  const cap = XP_GATES[index + 1] ?? floor
  return { have: floor, next: cap }
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export function swordBox(x: number, feetY: number, facing: 1 | -1): Rect {
  const w = 26
  const h = 14
  return { x: facing > 0 ? x + 2 : x - 2 - w, y: feetY - 24, w, h }
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

export function isStomp(vy: number, playerBottom: number, enemyTop: number): boolean {
  return vy > 20 && playerBottom <= enemyTop + 12
}

export function resolveContact(input: { stomping: boolean; invulnerable: boolean; striking: boolean }): 'hurt-enemy' | 'hurt-player' | 'ignore' {
  if (input.striking || input.stomping) return 'hurt-enemy'
  if (input.invulnerable) return 'ignore'
  return 'hurt-player'
}
