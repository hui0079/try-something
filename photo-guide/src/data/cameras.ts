import type { Camera, Sensor } from './types.ts'

export const sensorLabel: Record<Sensor, string> = {
  ff: '全画幅',
  apsc: 'APS-C',
  m43: 'M43',
}

export const cameras: Camera[] = [
  {
    id: 'sony-a7m4',
    brand: '索尼',
    name: 'A7 IV',
    sensor: 'ff',
    cropFactor: 1,
    match: ['ILCE-7M4', 'A7 IV', 'A7M4'],
  },
  {
    id: 'sony-a7c2',
    brand: '索尼',
    name: 'A7C II',
    sensor: 'ff',
    cropFactor: 1,
    match: ['ILCE-7CM2', 'A7C II', 'A7C2'],
  },
  {
    id: 'canon-r6ii',
    brand: '佳能',
    name: 'EOS R6 Mark II',
    sensor: 'ff',
    cropFactor: 1,
    match: ['R6 Mark II', 'R6m2'],
  },
  {
    id: 'nikon-z6iii',
    brand: '尼康',
    name: 'Z6 III',
    sensor: 'ff',
    cropFactor: 1,
    match: ['Z6 III', 'Z 6III', 'Z6_3'],
  },
  {
    id: 'fuji-xt5',
    brand: '富士',
    name: 'X-T5',
    sensor: 'apsc',
    cropFactor: 1.5,
    match: ['X-T5'],
  },
  {
    id: 'sony-a6700',
    brand: '索尼',
    name: 'A6700',
    sensor: 'apsc',
    cropFactor: 1.5,
    match: ['ILCE-6700', 'A6700'],
  },
  {
    id: 'canon-r7',
    brand: '佳能',
    name: 'EOS R7',
    sensor: 'apsc',
    cropFactor: 1.6,
    match: ['EOS R7'],
  },
  {
    id: 'om-5',
    brand: 'OM System',
    name: 'OM-5',
    sensor: 'm43',
    cropFactor: 2,
    match: ['OM-5'],
  },
  {
    id: 'unknown-ff',
    brand: '不确定',
    name: '全画幅',
    sensor: 'ff',
    cropFactor: 1,
    match: [],
  },
  {
    id: 'unknown-apsc',
    brand: '不确定',
    name: 'APS-C',
    sensor: 'apsc',
    cropFactor: 1.5,
    match: [],
  },
  {
    id: 'unknown-m43',
    brand: '不确定',
    name: 'M43',
    sensor: 'm43',
    cropFactor: 2,
    match: [],
  },
]

export function cameraById(id: string): Camera {
  const camera = cameras.find((item) => item.id === id)
  if (!camera) throw new Error(`unknown camera ${id}`)
  return camera
}

export function cameraLabel(camera: Camera): string {
  if (camera.brand === '不确定') return `不确定 · ${camera.name}`
  return `${camera.brand} ${camera.name}`
}

export function matchCamera(model?: string): Camera | undefined {
  if (!model) return undefined
  const haystack = model.toUpperCase()
  let best: { camera: Camera; length: number } | undefined
  for (const camera of cameras) {
    for (const token of camera.match) {
      if (haystack.includes(token.toUpperCase()) && (!best || token.length > best.length)) {
        best = { camera, length: token.length }
      }
    }
  }
  return best?.camera
}
