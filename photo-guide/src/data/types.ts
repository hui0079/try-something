export type Sensor = 'ff' | 'apsc' | 'm43'

export type SceneId = 'portrait' | 'night' | 'landscape' | 'street' | 'sports'

export type FocalClass = 'wide' | 'normal' | 'short-tele' | 'tele'

export type Scene = {
  id: SceneId
  name: string
  summary: string
  hint: string
}

export type Camera = {
  id: string
  brand: string
  name: string
  sensor: Sensor
  cropFactor: number
  match: string[]
}

export type Lens = {
  id: string
  name: string
  focalMin: number
  focalMax: number
  maxAperture: number
  kind: 'prime' | 'zoom'
}

export type PhotoExif = {
  make?: string
  model?: string
  lens?: string
  aperture?: number
  shutter?: number
  iso?: number
  focalLength?: number
  focalLength35mm?: number
}
