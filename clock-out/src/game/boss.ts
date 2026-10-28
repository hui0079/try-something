export const BOSS_MAX_HP = 12

export interface BossState {
  hp: number
  phase: 1 | 2
  hurt: number
  lunge: number
  cooldown: number
  dead: boolean
}

export function createBoss(): BossState {
  return { hp: BOSS_MAX_HP, phase: 1, hurt: 0, lunge: 0, cooldown: 900, dead: false }
}

export function hurtBoss(state: BossState, amount: number): { state: BossState; killed: boolean } {
  if (state.dead || state.hurt > 0 || amount <= 0) return { state, killed: false }
  const hp = Math.max(0, state.hp - amount)
  if (hp <= 0) return { state: { ...state, hp: 0, dead: true, hurt: 0, lunge: 0 }, killed: true }
  return {
    state: { ...state, hp, phase: hp <= BOSS_MAX_HP / 2 ? 2 : state.phase, hurt: 420 },
    killed: false,
  }
}

export function tickBoss(state: BossState, dt: number): BossState {
  if (state.dead) return state
  const hurt = Math.max(0, state.hurt - dt)
  let lunge = Math.max(0, state.lunge - dt)
  let cooldown = state.cooldown - dt
  if (lunge <= 0 && cooldown <= 0) {
    lunge = state.phase === 2 ? 320 : 240
    cooldown = state.phase === 2 ? 700 : 1200
  }
  return { ...state, hurt, lunge, cooldown }
}

export function bossSpeed(state: BossState): number {
  if (state.dead) return 0
  if (state.lunge > 0) return state.phase === 2 ? 210 : 160
  return state.phase === 2 ? 70 : 42
}
