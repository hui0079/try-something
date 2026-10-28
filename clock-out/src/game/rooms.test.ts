import { describe, expect, it } from 'vitest'
import { dashJumpDistance, jumpDistance, jumpHeight } from './player'
import {
  FLOOR_Y,
  ROOMS,
  columnHasFloor,
  isSafeStand,
  land,
  opposite,
  surfaceTops,
  tryLeave,
  widestFloorHole,
} from './rooms'

describe('castle geometry', () => {
  it('keeps a running jump out of the court pit and lets a dash jump cross it', () => {
    const pit = widestFloorHole(ROOMS.court.tiles)
    expect(pit).toBeGreaterThan(0)
    expect(jumpDistance()).toBeLessThan(pit)
    expect(dashJumpDistance()).toBeGreaterThan(pit)
  })

  it('saves the clock shaft for a double jump', () => {
    const tops = surfaceTops(ROOMS.hall.tiles)
    expect(tops).toContain(128)
    expect(128 - jumpHeight()).toBeGreaterThan(18)
    expect(128 - jumpHeight() * 2).toBeLessThan(18)
  })

  it('lets a single jump climb the gate and court stairs', () => {
    for (const id of ['gate', 'court'] as const) {
      const tops = surfaceTops(ROOMS[id].tiles)
      for (let i = 1; i < tops.length; i++) {
        expect(tops[i] - tops[i - 1]).toBeLessThan(jumpHeight())
      }
    }
  })

  it('lands beside the passage you came through', () => {
    for (const room of Object.values(ROOMS)) {
      for (const passage of room.passages) {
        const dest = ROOMS[passage.to]
        const via = opposite(passage.dir)
        const spot = land(dest, via, (passage.min + passage.max) / 2)
        const where = `${room.id}->${passage.to}`
        if (via === 'up') {
          expect(columnHasFloor(dest.tiles, spot.x, spot.y), where).toBe(true)
          expect(tryLeave(dest, spot.x, spot.y, new Set(['boots', 'cloak', 'badge']), true), where).toBeNull()
          continue
        }
        expect(isSafeStand(dest.tiles, spot.x, spot.y), where).toBe(true)
        expect(spot.y).toBe(FLOOR_Y)
        expect(tryLeave(dest, spot.x, spot.y, new Set(['boots', 'cloak', 'badge']), true), where).toBeNull()
      }
    }
  })
})
