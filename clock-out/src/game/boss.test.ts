import { describe, expect, it } from 'vitest'
import { BOSS_MAX_HP, bossSpeed, createBoss, hurtBoss, tickBoss } from './boss'

describe('throne boss', () => {
  it('ignores hits during the hurt pause and changes phase at half health', () => {
    const first = hurtBoss(createBoss(), 1)
    expect(first.state.hp).toBe(BOSS_MAX_HP - 1)
    expect(first.killed).toBe(false)
    expect(hurtBoss(first.state, 1).state.hp).toBe(first.state.hp)
    const wounded = hurtBoss({ ...first.state, hurt: 0 }, 5)
    expect(wounded.state.phase).toBe(2)
  })

  it('lunges, then dies at zero', () => {
    const lunged = tickBoss({ ...createBoss(), cooldown: 0 }, 16)
    expect(lunged.lunge).toBeGreaterThan(0)
    expect(bossSpeed(lunged)).toBeGreaterThan(bossSpeed(createBoss()))
    const dead = hurtBoss({ ...createBoss(), hurt: 0 }, BOSS_MAX_HP)
    expect(dead.killed).toBe(true)
    expect(dead.state.dead).toBe(true)
    expect(bossSpeed(dead.state)).toBe(0)
  })
})
