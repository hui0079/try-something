import { describe, expect, it } from 'vitest'
import { canObtain, canReach } from './reach'

describe('castle routes', () => {
  it('opens the chapel and library before any relic', () => {
    expect(canReach('chapel', new Set())).toBe(true)
    expect(canReach('library', new Set())).toBe(true)
    expect(canObtain('boots', new Set())).toBe(true)
    expect(canObtain('cloak', new Set())).toBe(true)
  })

  it('keeps the clock behind the boots and the crypt behind the cloak', () => {
    expect(canReach('clock', new Set())).toBe(false)
    expect(canObtain('badge', new Set())).toBe(false)
    expect(canReach('clock', new Set(['boots']))).toBe(true)
    expect(canObtain('badge', new Set(['boots']))).toBe(true)
    expect(canReach('crypt', new Set())).toBe(false)
    expect(canReach('crypt', new Set(['cloak']))).toBe(true)
  })

  it('opens the throne only with all three seals, and the roof after the fight', () => {
    const pair = new Set(['boots', 'cloak'] as const)
    expect(canReach('throne', pair)).toBe(false)
    const all = new Set(['boots', 'cloak', 'badge'] as const)
    expect(canReach('throne', all)).toBe(true)
    expect(canReach('roof', all)).toBe(false)
    expect(canReach('roof', all, true)).toBe(true)
  })
})
