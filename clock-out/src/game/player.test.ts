import { describe, expect, it } from 'vitest'
import { levelFor, maxHp, rectsOverlap, resolveContact, swordBox, swordDamage, xpSpan } from './player'

describe('hunter', () => {
  it('puts the sword in front of the hunter', () => {
    const right = swordBox(100, 176, 1)
    const left = swordBox(100, 176, -1)
    expect(right.x).toBeGreaterThan(100)
    expect(left.x + left.w).toBeLessThan(100)
    expect(rectsOverlap(right, { x: 104, y: 150, w: 10, h: 10 })).toBe(true)
    expect(rectsOverlap(right, { x: 40, y: 150, w: 10, h: 10 })).toBe(false)
  })

  it('raises health and sword damage with the level', () => {
    expect(levelFor(0)).toBe(1)
    expect(levelFor(12)).toBe(2)
    expect(levelFor(30)).toBe(3)
    expect(levelFor(54)).toBe(4)
    expect(maxHp(1)).toBe(4)
    expect(maxHp(3)).toBe(6)
    expect(swordDamage(1)).toBe(1)
    expect(swordDamage(4)).toBe(4)
    expect(xpSpan(1)).toEqual({ have: 0, next: 12 })
    expect(xpSpan(4)).toEqual({ have: 54, next: 54 })
  })

  it('lets a sword hit or a stomp hurt the enemy', () => {
    expect(resolveContact({ striking: true, stomping: false, invulnerable: false })).toBe('hurt-enemy')
    expect(resolveContact({ striking: false, stomping: true, invulnerable: false })).toBe('hurt-enemy')
    expect(resolveContact({ striking: false, stomping: false, invulnerable: true })).toBe('ignore')
    expect(resolveContact({ striking: false, stomping: false, invulnerable: false })).toBe('hurt-player')
  })
})
