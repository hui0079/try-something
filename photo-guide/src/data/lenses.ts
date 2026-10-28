import type { Lens } from './types.ts'

export const lenses: Lens[] = [
  { id: '24-14', name: '24mm f/1.4', focalMin: 24, focalMax: 24, maxAperture: 1.4, kind: 'prime' },
  { id: '35-14', name: '35mm f/1.4', focalMin: 35, focalMax: 35, maxAperture: 1.4, kind: 'prime' },
  { id: '50-18', name: '50mm f/1.8', focalMin: 50, focalMax: 50, maxAperture: 1.8, kind: 'prime' },
  { id: '85-18', name: '85mm f/1.8', focalMin: 85, focalMax: 85, maxAperture: 1.8, kind: 'prime' },
  { id: '135-18', name: '135mm f/1.8', focalMin: 135, focalMax: 135, maxAperture: 1.8, kind: 'prime' },
  { id: '16-35', name: '16-35mm f/2.8', focalMin: 16, focalMax: 35, maxAperture: 2.8, kind: 'zoom' },
  { id: '24-70', name: '24-70mm f/2.8', focalMin: 24, focalMax: 70, maxAperture: 2.8, kind: 'zoom' },
  { id: '70-200', name: '70-200mm f/2.8', focalMin: 70, focalMax: 200, maxAperture: 2.8, kind: 'zoom' },
  { id: '23-14', name: '23mm f/1.4', focalMin: 23, focalMax: 23, maxAperture: 1.4, kind: 'prime' },
  { id: '56-12', name: '56mm f/1.2', focalMin: 56, focalMax: 56, maxAperture: 1.2, kind: 'prime' },
]

export function lensById(id: string): Lens {
  const lens = lenses.find((item) => item.id === id)
  if (!lens) throw new Error(`unknown lens ${id}`)
  return lens
}

export function focalStops(lens: Lens): number[] {
  if (lens.focalMin === lens.focalMax) return [lens.focalMin]
  const mid = lens.focalMax - lens.focalMin > 80 ? 135 : lens.focalMin < 20 ? 24 : 50
  const clamped = Math.min(lens.focalMax, Math.max(lens.focalMin, mid))
  return [...new Set([lens.focalMin, clamped, lens.focalMax])]
}

export function defaultFocal(lens: Lens): number {
  const stops = focalStops(lens)
  return stops[Math.floor((stops.length - 1) / 2)] ?? lens.focalMin
}
