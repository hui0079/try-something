import { describe, expect, it } from 'vitest'
import { cameraById } from '../data/cameras.ts'
import { lensById } from '../data/lenses.ts'
import { sceneById } from '../data/scenes.ts'
import type { Camera, FocalClass, Lens, Sensor } from '../data/types.ts'
import { buildGuide, focalClassOf } from './guide.ts'

const sensors: Sensor[] = ['ff', 'apsc', 'm43']
const classes: FocalClass[] = ['wide', 'normal', 'short-tele', 'tele']
const crops: Record<Sensor, number> = { ff: 1, apsc: 1.5, m43: 2 }
const classFocal: Record<FocalClass, number> = {
  wide: 24,
  normal: 50,
  'short-tele': 85,
  tele: 200,
}

describe('buildGuide', () => {
  it('recommends a wider aperture and a faster-than-safe shutter for portraits', () => {
    const guide = buildGuide(sceneById('portrait'), cameraById('sony-a7m4'), lensById('85-18'), 85)
    expect(guide.aperture).toContain('f/1.8')
    expect(guide.shutter).toContain('1/125')
    expect(guide.shutter).toContain('1/85')
    expect(guide.iso).toContain('3200')
    expect(guide.equivalentFocal).toBe(85)
    expect(guide.focalClass).toBe('short-tele')
    expect(guide.why.length).toBeGreaterThan(1)
    expect(guide.pitfalls.length).toBeGreaterThan(0)
    expect(guide.composition.some((line) => line.includes('眼睛'))).toBe(true)
  })

  it('tightens the safe shutter and ISO ceiling on a smaller sensor', () => {
    const guide = buildGuide(sceneById('portrait'), cameraById('om-5'), lensById('85-18'), 85)
    expect(guide.equivalentFocal).toBe(170)
    expect(guide.focalClass).toBe('tele')
    expect(guide.shutter).toContain('1/170')
    expect(guide.iso).toContain('800')
  })

  it('asks for f/8 and a fast shutter floor by scene', () => {
    const landscape = buildGuide(sceneById('landscape'), cameraById('sony-a7m4'), lensById('24-14'), 24)
    const sports = buildGuide(sceneById('sports'), cameraById('sony-a7m4'), lensById('70-200'), 200)
    expect(landscape.aperture).toContain('f/8')
    expect(landscape.composition.join('')).toContain('竖线')
    expect(sports.shutter).toContain('1/1000')
    expect(sports.composition.join('')).toContain('前方')
    expect(landscape.composition.join('')).not.toBe(sports.composition.join(''))
    expect(focalClassOf(24)).toBe('wide')
    expect(focalClassOf(50)).toBe('normal')
    expect(focalClassOf(85)).toBe('short-tele')
    expect(focalClassOf(200)).toBe('tele')
  })

  it('produces settings for every scene, sensor, and focal class', () => {
    const openLens: Lens = {
      id: 'test',
      name: 'test',
      focalMin: 1,
      focalMax: 600,
      maxAperture: 1.8,
      kind: 'zoom',
    }
    const seen = new Set<string>()
    for (const scene of ['portrait', 'night', 'landscape', 'street', 'sports'] as const) {
      for (const sensor of sensors) {
        for (const focalClass of classes) {
          const camera: Camera = {
            id: sensor,
            brand: '测试',
            name: sensor,
            sensor,
            cropFactor: crops[sensor],
            match: [],
          }
          const focal = classFocal[focalClass] / crops[sensor]
          const guide = buildGuide(sceneById(scene), camera, openLens, focal)
          expect(guide.aperture.length).toBeGreaterThan(0)
          expect(guide.shutter.length).toBeGreaterThan(0)
          expect(guide.iso.length).toBeGreaterThan(0)
          expect(guide.focus.length).toBeGreaterThan(0)
          expect(guide.composition.length).toBeGreaterThan(1)
          expect(guide.focalClass).toBe(focalClass)
          seen.add(`${guide.aperture}|${guide.shutter}|${guide.iso}`)
        }
      }
    }
    expect(seen.size).toBeGreaterThan(20)
  })
})
