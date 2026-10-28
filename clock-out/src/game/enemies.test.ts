import { describe, expect, it } from 'vitest'
import { patrol } from './enemies'

describe('patrol', () => {
  it('turns around at the ends of the walk', () => {
    expect(patrol(40, -1, 40, 200).dir).toBe(1)
    expect(patrol(200, 1, 40, 200).dir).toBe(-1)
    expect(patrol(80, 1, 40, 200).dir).toBe(1)
  })
})
