import { cameraLabel, sensorLabel } from '../data/cameras.ts'
import { focalClassLabel, sceneCopy } from '../data/recipes.ts'
import type { Camera, FocalClass, Lens, Scene, SceneId, Sensor } from '../data/types.ts'
import { formatF, safeShutterDenom } from './format.ts'

export type Guide = {
  sceneName: string
  cameraLabel: string
  lensLabel: string
  focalLength: number
  equivalentFocal: number
  focalClass: FocalClass
  focalClassLabel: string
  sensorLabel: string
  lede: string
  aperture: string
  shutter: string
  iso: string
  focus: string
  metering: string
  why: string[]
  pitfalls: string[]
  composition: string[]
}

export function focalClassOf(equivalentFocal: number): FocalClass {
  if (equivalentFocal < 35) return 'wide'
  if (equivalentFocal < 70) return 'normal'
  if (equivalentFocal < 135) return 'short-tele'
  return 'tele'
}

export function buildGuide(scene: Scene, camera: Camera, lens: Lens, focalLength: number): Guide {
  const focal = clamp(focalLength, lens.focalMin, lens.focalMax)
  const equivalentExact = focal * camera.cropFactor
  const equivalentFocal = Math.round(equivalentExact)
  const focalClass = focalClassOf(equivalentExact)
  const copy = sceneCopy[scene.id]
  const sensorName = sensorLabel[camera.sensor]
  const className = focalClassLabel[focalClass]

  return {
    sceneName: scene.name,
    cameraLabel: cameraLabel(camera),
    lensLabel: lensAt(lens, focal),
    focalLength: focal,
    equivalentFocal,
    focalClass,
    focalClassLabel: className,
    sensorLabel: sensorName,
    lede: `${sensorName}上 ${trimFocal(focal)}mm 等效约 ${equivalentFocal}mm，属于${className}。`,
    aperture: apertureAdvice(scene.id, lens, focalClass),
    shutter: shutterAdvice(scene.id, focal, camera.cropFactor),
    iso: isoAdvice(camera.sensor, scene.id),
    focus: copy.focus,
    metering: copy.metering,
    why: [copy.classNote[focalClass], ...copy.why],
    pitfalls: copy.pitfalls,
    composition: [copy.framing[focalClass], ...copy.composition],
  }
}

function lensAt(lens: Lens, focal: number): string {
  if (lens.focalMin === lens.focalMax) return lens.name
  return `${lens.name} @ ${trimFocal(focal)}mm`
}

function trimFocal(focal: number): number {
  return Math.round(focal * 10) / 10
}

function apertureAdvice(sceneId: SceneId, lens: Lens, focalClass: FocalClass): string {
  const maxLabel = formatF(lens.maxAperture)
  switch (sceneId) {
    case 'portrait':
      if (focalClass === 'wide') {
        return lens.maxAperture > 2.8
          ? `广角人像用最大光圈 f/${maxLabel}，人放在画面中间`
          : 'f/2–f/2.8。广角再开大容易变形，人放在画面中间'
      }
      if (lens.maxAperture > 2.8) return `用最大光圈 f/${maxLabel}，并让主体离背景远一些`
      if (lens.maxAperture <= 1.4) {
        return `f/1.8–f/2.8。最大光圈 f/${maxLabel} 景深很薄，眼睛对实再考虑全开`
      }
      if (lens.maxAperture < 2.8) return `f/${maxLabel}–f/2.8`
      return 'f/2.8，这是这支镜头的最大光圈'
    case 'night':
      if (lens.maxAperture <= 2.8) {
        return lens.maxAperture < 2.8
          ? `开到 f/${maxLabel}–f/2.8，先让快门过安全线`
          : '开到 f/2.8，先让快门过安全线'
      }
      return `用最大光圈 f/${maxLabel}。这支镜头进光有限，优先上三脚架`
    case 'landscape':
      return `f/8–f/11。最大光圈 f/${maxLabel} 留给暗光，风景先收小`
    case 'street':
      if (lens.maxAperture > 5.6) {
        return `用最大光圈 f/${maxLabel}，距离感靠站位而不是景深`
      }
      return 'f/5.6–f/8，预对焦到大约 2 到 3 米'
    case 'sports':
      if (lens.maxAperture > 4) return `用最大光圈 f/${maxLabel}，快门不够就升 ISO`
      if (lens.maxAperture < 2.8) return `f/${maxLabel}–f/4，把快门留在 1/1000`
      return 'f/2.8–f/4，把快门留在 1/1000'
  }
}

function shutterAdvice(sceneId: SceneId, focal: number, cropFactor: number): string {
  const safe = safeShutterDenom(focal, cropFactor)
  const safeLabel = `1/${safe}`
  switch (sceneId) {
    case 'portrait': {
      const floor = Math.max(safe, 125)
      return floor === safe
        ? `不低于 1/${floor}。${trimFocal(focal)}mm 在这个画幅上的防手抖约 ${safeLabel}`
        : `不低于 1/${floor}。防手抖约 ${safeLabel}，人会微微动，快门再快一点更稳`
    }
    case 'night':
      return `手持不低于 ${safeLabel}。要拍光轨或星点就上三脚架，快门可以到 1 秒以上`
    case 'landscape':
      return `手持不低于 ${safeLabel}。上了三脚架就可以按曝光需要放慢，ISO 保持在低位`
    case 'street': {
      const floor = Math.max(safe, 250)
      return `不低于 1/${floor}。防手抖约 ${safeLabel}，走路的人要用 1/250 或更快`
    }
    case 'sports': {
      const floor = Math.max(safe, 1000)
      return `不低于 1/${floor}。防手抖只要求约 ${safeLabel}，冻结跑动需要 1/1000 左右`
    }
  }
}

function isoAdvice(sensor: Sensor, sceneId: SceneId): string {
  const band = {
    ff: { daily: '100–3200', stretch: '6400', night: '100–6400', nightStretch: '12800' },
    apsc: { daily: '100–1600', stretch: '3200', night: '100–3200', nightStretch: '6400' },
    m43: { daily: '100–800', stretch: '1600', night: '100–1600', nightStretch: '3200' },
  }[sensor]

  if (sceneId === 'landscape') return 'ISO 100–400。风景把画质留给光圈和三脚架'
  if (sceneId === 'night' || sceneId === 'sports') {
    return `ISO ${band.night}，再暗可到 ${band.nightStretch}`
  }
  return `ISO ${band.daily}，暗处可到 ${band.stretch}`
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
