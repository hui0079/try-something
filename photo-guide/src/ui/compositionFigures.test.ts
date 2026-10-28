import { describe, expect, it } from 'vitest'
import type { FocalClass, SceneId } from '../data/types.ts'
import { figureCaption, figureKind } from './compositionFigures.ts'

const scenes: SceneId[] = ['portrait', 'night', 'landscape', 'street', 'sports']
const focals: FocalClass[] = ['wide', 'normal', 'short-tele', 'tele']

describe('composition figures', () => {
  it('gives every scene its own example', () => {
    const captions = new Set(scenes.map((scene) => figureCaption(figureKind(scene, 'normal'))))
    expect(captions.size).toBe(scenes.length)
  })

  it('changes the picture when the focal class changes the framing', () => {
    expect(figureKind('portrait', 'wide')).toBe('portrait-center')
    expect(figureKind('portrait', 'short-tele')).toBe('portrait-offset')
    expect(figureKind('landscape', 'wide')).toBe('land-wide')
    expect(figureCaption(figureKind('landscape', 'wide'))).toContain('竖线')
    expect(figureKind('night', 'tele')).toBe('night-light')
    for (const focal of focals) {
      expect(figureCaption(figureKind('sports', focal)).length).toBeGreaterThan(0)
    }
  })
})
