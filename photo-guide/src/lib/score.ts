import type { PhotoExif, SceneId } from '../data/types.ts'
import { fastestSafeStandard, formatF, formatShutter, safeShutterDenom } from './format.ts'
import type { PixelStats } from './pixels.ts'

export type CheckStatus = 'good' | 'warn' | 'bad'

export type ScoreCheck = {
  id: 'exposure' | 'sharpness' | 'composition' | 'shutter' | 'iso' | 'aperture'
  label: string
  status: CheckStatus
  points: number
  current: string
  suggested: string
  reason: string
}

export type ExifReadout = {
  label: string
  value: string
}

export type ScoreResult =
  | { ok: false; missing: string[]; message: string; detail: string }
  | {
      ok: true
      total: number
      headline: string
      checks: ScoreCheck[]
      note?: string
    }

const WEIGHT = {
  exposure: 34,
  sharpness: 33,
  composition: 33,
  shutter: 34,
  iso: 33,
  aperture: 33,
} as const

export function describeExif(exif: PhotoExif): ExifReadout[] {
  const rows: ExifReadout[] = []
  if (exif.model) {
    rows.push({ label: '机身', value: [exif.make, exif.model].filter(Boolean).join(' ') })
  }
  if (exif.lens) rows.push({ label: '镜头', value: exif.lens })
  if (exif.aperture) rows.push({ label: '光圈', value: `f/${formatF(exif.aperture)}` })
  if (exif.shutter) rows.push({ label: '快门', value: formatShutter(exif.shutter) })
  if (exif.iso) rows.push({ label: 'ISO', value: String(Math.round(exif.iso)) })
  if (exif.focalLength) rows.push({ label: '焦距', value: `${trim(exif.focalLength)}mm` })
  if (exif.focalLength35mm) rows.push({ label: '等效焦距', value: `${Math.round(exif.focalLength35mm)}mm` })
  return rows
}

export function scorePhoto(exif: PhotoExif, sceneId: SceneId, pixels?: PixelStats | null): ScoreResult {
  const missing = missingFields(exif)
  const visual = pixels ? visualChecks(sceneId, pixels) : []
  if (missing.length > 0 && visual.length === 0) {
    return {
      ok: false,
      missing,
      message: '这张没有拍摄参数，也读不出画面，没法打分。',
      detail: `缺少${missing.join('、')}。截图、转发图和一些社交平台会把参数丢掉。`,
    }
  }

  const checks = [...visual, ...(missing.length === 0 ? exposureChecks(exif, sceneId) : [])]
  const earned = checks.reduce((sum, check) => sum + check.points, 0)
  const max = checks.reduce((sum, check) => sum + WEIGHT[check.id], 0)
  const total = Math.round((earned / max) * 100)

  return {
    ok: true,
    total,
    headline: scoreHeadline(total, missing.length > 0),
    checks,
    note: missing.length > 0 ? '没有完整拍摄参数，这次只看画面和构图。' : undefined,
  }
}

function exposureChecks(exif: PhotoExif, sceneId: SceneId): ScoreCheck[] {
  const focal = exif.focalLength35mm ?? exif.focalLength!
  return [
    scoreShutter(sceneId, exif.shutter!, focal),
    scoreIso(sceneId, exif.iso!),
    scoreAperture(sceneId, exif.aperture!),
  ]
}

export function scoreHeadline(total: number, visualOnly = false): string {
  if (total >= 90) return visualOnly ? '画面和构图都站得住' : '画面和参数都站得住'
  if (total >= 70) return '改一两处会更好'
  if (total >= 45) return '有一项明显不合适'
  return '这张和场景差得比较远'
}

export function missingFields(exif: PhotoExif): string[] {
  const missing: string[] = []
  if (!exif.aperture) missing.push('光圈')
  if (!exif.shutter) missing.push('快门')
  if (!exif.iso) missing.push('ISO')
  if (!exif.focalLength) missing.push('焦距')
  return missing
}

function visualChecks(sceneId: SceneId, pixels: PixelStats): ScoreCheck[] {
  return [scoreExposure(sceneId, pixels), scoreSharpness(pixels), scoreComposition(sceneId, pixels)]
}

function scoreExposure(sceneId: SceneId, pixels: PixelStats): ScoreCheck {
  const status = exposureStatus(sceneId, pixels)
  const current = `平均亮度 ${Math.round(pixels.meanLuma * 100)}%`
  const reason =
    status === 'good'
      ? '明暗分布还稳，高光和暗部没有大片死掉。'
      : sceneId === 'night' && pixels.meanLuma > 0.62
        ? '夜景被拍得太亮，黑位发灰，灯光也容易溢出。'
        : pixels.clipHigh > 0.08 || pixels.meanLuma > 0.82
          ? '画面偏亮，有一块高光接近死白。'
          : '画面偏暗，暗部糊在一起，主体不容易分开。'
  return {
    id: 'exposure',
    label: '曝光',
    status,
    points: pointsFor(WEIGHT.exposure, status),
    current,
    suggested: sceneId === 'night' ? '留下黑色，只保住主体和灯光' : '主体有层次，高光不要大片死白',
    reason,
  }
}

function exposureStatus(sceneId: SceneId, pixels: PixelStats): CheckStatus {
  if (sceneId === 'night') {
    if (pixels.clipHigh > 0.18) return 'bad'
    if (pixels.meanLuma < 0.06 && pixels.clipLow > 0.55) return 'bad'
    if (pixels.meanLuma > 0.7) return 'bad'
    if (pixels.meanLuma > 0.55 || pixels.clipHigh > 0.08) return 'warn'
    if (pixels.meanLuma >= 0.08 && pixels.meanLuma <= 0.5) return 'good'
    return 'warn'
  }
  if (pixels.clipHigh > 0.12 || pixels.meanLuma > 0.86) return 'bad'
  if (pixels.clipLow > 0.4 || pixels.meanLuma < 0.16) return 'bad'
  if (pixels.clipHigh > 0.04 || pixels.clipLow > 0.18 || pixels.meanLuma < 0.28 || pixels.meanLuma > 0.75) {
    return 'warn'
  }
  return 'good'
}

function scoreSharpness(pixels: PixelStats): ScoreCheck {
  const status: CheckStatus = pixels.sharpness < 80 ? 'bad' : pixels.sharpness < 250 ? 'warn' : 'good'
  const reason =
    status === 'good'
      ? '边缘对比够，主体看起来是实的。'
      : status === 'warn'
        ? '细节有点发软，可能是对焦偏了，或者快门不够快。'
        : '几乎没有清晰边缘，这张发虚。'
  return {
    id: 'sharpness',
    label: '清晰',
    status,
    points: pointsFor(WEIGHT.sharpness, status),
    current: status === 'good' ? '边缘清楚' : status === 'warn' ? '边缘偏软' : '边缘很弱',
    suggested: '主体边缘清楚',
    reason,
  }
}

function scoreComposition(sceneId: SceneId, pixels: PixelStats): ScoreCheck {
  if (pixels.detail < 1.2) {
    return compositionCheck(
      'warn',
      '主体不清楚',
      '把主体和背景拉开',
      '画面对比太弱，看不出主体落在哪里。',
    )
  }
  if (onEdge(pixels.subjectX, pixels.subjectY)) {
    return compositionCheck('bad', '主体贴边', '主体离开边缘一点', '最清楚的一块贴着画面边缘，容易被切掉。')
  }
  if (
    (sceneId === 'landscape' || sceneId === 'night') &&
    pixels.hasHorizon &&
    pixels.horizonTilt > 0.08 &&
    !pixels.verticalsConverge
  ) {
    return compositionCheck(
      'bad',
      '地平线是斜的',
      '把地平线放平',
      '整条地平线在斜着，相机大概没端平。近处仰拍建筑时左右竖线会往上收，那种不按拍歪算。',
    )
  }

  const thirds = distanceToThirds(pixels.subjectX, pixels.subjectY)
  const center = Math.hypot(pixels.subjectX - 0.5, pixels.subjectY - 0.5)
  if (sceneId === 'portrait') {
    const faceZone =
      pixels.subjectX > 0.28 && pixels.subjectX < 0.72 && pixels.subjectY > 0.2 && pixels.subjectY < 0.62
    if (faceZone || thirds < 0.2) {
      return compositionCheck('good', '主体位置合适', '保持主体的位置', '最清楚的一块在上半部，符合人像常见的位置。')
    }
    return compositionCheck(
      'warn',
      '主体偏了',
      '眼睛放到上三分之一附近',
      '人像通常把眼睛放在上三分之一，现在最清楚的一块不在那里。',
    )
  }
  if (thirds < 0.2) {
    return compositionCheck('good', '主体靠近三分线', '保持主体的位置', '最清楚的一块落在三分线附近，画面有停留点。')
  }
  if (center < 0.12) {
    return compositionCheck(
      'warn',
      '主体在正中',
      '往三分线让一点',
      '主体压在画面正中。人像可以这样，这个场景留出一侧通常更有方向。',
    )
  }
  return compositionCheck('warn', '主体位置偏散', '把主体挪到三分线附近', '最清楚的一块没有落在三分线附近。')
}

function compositionCheck(
  status: CheckStatus,
  current: string,
  suggested: string,
  reason: string,
): ScoreCheck {
  return {
    id: 'composition',
    label: '构图',
    status,
    points: pointsFor(WEIGHT.composition, status),
    current,
    suggested,
    reason,
  }
}

function onEdge(x: number, y: number): boolean {
  return x < 0.18 || x > 0.82 || y < 0.18 || y > 0.82
}

function distanceToThirds(x: number, y: number): number {
  const points = [
    [1 / 3, 1 / 3],
    [2 / 3, 1 / 3],
    [1 / 3, 2 / 3],
    [2 / 3, 2 / 3],
  ]
  return Math.min(...points.map(([px, py]) => Math.hypot(x - px!, y - py!)))
}

function scoreShutter(sceneId: SceneId, actual: number, focal: number): ScoreCheck {
  const safe = 1 / focal
  const limit = shutterLimit(sceneId, safe)
  const status = slowerStatus(actual, limit)
  const suggestedSpeed = formatShutter(fastestSafeStandard(limit))
  const safeLabel = `1/${safeShutterDenom(focal, 1)}`
  const current = formatShutter(actual)
  return {
    id: 'shutter',
    label: '快门',
    status,
    points: pointsFor(WEIGHT.shutter, status),
    current,
    suggested: `不低于 ${suggestedSpeed}`,
    reason: shutterReason(status, current, suggestedSpeed, safeLabel, sceneId),
  }
}

function shutterLimit(sceneId: SceneId, safeSeconds: number): number {
  switch (sceneId) {
    case 'portrait':
      return Math.min(safeSeconds, 1 / 125)
    case 'street':
      return Math.min(safeSeconds, 1 / 250)
    case 'sports':
      return Math.min(safeSeconds, 1 / 1000)
    case 'landscape':
    case 'night':
      return safeSeconds
  }
}

function slowerStatus(actual: number, limit: number): CheckStatus {
  if (actual <= limit * 1.05) return 'good'
  if (actual <= limit * 2.05) return 'warn'
  return 'bad'
}

function shutterReason(
  status: CheckStatus,
  current: string,
  suggested: string,
  safeLabel: string,
  sceneId: SceneId,
): string {
  if (status === 'good') {
    return `快门 ${current} 已经快过 ${suggested}。手持大约 ${safeLabel} 就不容易糊。`
  }
  const sceneLine =
    sceneId === 'sports'
      ? '运动要冻结动作，不能只停在防手抖线上。'
      : sceneId === 'street'
        ? '走路的人会拖影，街拍要比防手抖更快。'
        : sceneId === 'portrait'
          ? '人会微微动，人像要比防手抖更快一点。'
          : sceneId === 'night'
            ? '如果已经上了三脚架，这条可以忽略。'
            : '如果已经上了三脚架，这条可以忽略。'
  return `当前 ${current}，慢于建议的 ${suggested}。手持防手抖大约是 ${safeLabel}。${sceneLine}`
}

function scoreIso(sceneId: SceneId, iso: number): ScoreCheck {
  const limits = isoLimits(sceneId)
  const status: CheckStatus = iso <= limits.good ? 'good' : iso <= limits.warn ? 'warn' : 'bad'
  const current = String(Math.round(iso))
  const suggested = `不超过 ${limits.good}`
  const reason =
    status === 'good'
      ? `ISO ${current} 还在这个场景比较稳的范围内。`
      : `ISO ${current} 高于这个场景比较稳妥的 ${limits.good}，暗部容易起彩噪。优先开大光圈或放慢到安全快门。`
  return {
    id: 'iso',
    label: 'ISO',
    status,
    points: pointsFor(WEIGHT.iso, status),
    current,
    suggested,
    reason,
  }
}

function isoLimits(sceneId: SceneId): { good: number; warn: number } {
  if (sceneId === 'landscape') return { good: 400, warn: 1600 }
  if (sceneId === 'night' || sceneId === 'sports') return { good: 6400, warn: 12800 }
  return { good: 3200, warn: 6400 }
}

function scoreAperture(sceneId: SceneId, aperture: number): ScoreCheck {
  const verdict = apertureVerdict(sceneId, aperture)
  return {
    id: 'aperture',
    label: '光圈',
    status: verdict.status,
    points: pointsFor(WEIGHT.aperture, verdict.status),
    current: `f/${formatF(aperture)}`,
    suggested: verdict.suggested,
    reason: verdict.reason,
  }
}

function apertureVerdict(sceneId: SceneId, aperture: number): {
  status: CheckStatus
  suggested: string
  reason: string
} {
  switch (sceneId) {
    case 'portrait':
      return band(
        aperture <= 2.8 ? 'good' : aperture <= 4 ? 'warn' : 'bad',
        'f/1.8–f/2.8',
        '人像靠较大光圈把人从背景里分离出来。',
        `当前 f/${formatF(aperture)} 偏小，背景不容易化开。`,
      )
    case 'night':
      return band(
        aperture <= 2.8 ? 'good' : aperture <= 4 ? 'warn' : 'bad',
        'f/2.8 或更大',
        '夜景手持时，大光圈是最先用来换快门的办法。',
        `当前 f/${formatF(aperture)} 进光偏少，快门和 ISO 会更难受。`,
      )
    case 'landscape':
      if (aperture >= 5.6 && aperture <= 11) {
        return {
          status: 'good',
          suggested: 'f/8–f/11',
          reason: '这个光圈前后景都比较清楚，也躲开了衍射。',
        }
      }
      if (aperture < 4) {
        return {
          status: 'bad',
          suggested: 'f/8–f/11',
          reason: `当前 f/${formatF(aperture)} 太开，风景的前后景只有一层是清楚的。`,
        }
      }
      return {
        status: 'warn',
        suggested: 'f/8–f/11',
        reason:
          aperture > 16
            ? `当前 f/${formatF(aperture)} 太小，衍射会让整张变肉。`
            : `当前 f/${formatF(aperture)} 能用，收到 f/8–f/11 通常更均衡。`,
      }
    case 'street':
      if (aperture >= 4 && aperture <= 8) {
        return {
          status: 'good',
          suggested: 'f/5.6–f/8',
          reason: '这个光圈有一段景深，适合预对焦等人走进来。',
        }
      }
      if (aperture >= 2.8 && aperture <= 11) {
        return {
          status: 'warn',
          suggested: 'f/5.6–f/8',
          reason: `当前 f/${formatF(aperture)} 勉强可用。街拍更稳的是 f/5.6–f/8。`,
        }
      }
      return {
        status: 'bad',
        suggested: 'f/5.6–f/8',
        reason:
          aperture < 2.8
            ? `当前 f/${formatF(aperture)} 太开，人一走过焦平面就糊。`
            : `当前 f/${formatF(aperture)} 太小，快门容易不够。`,
      }
    case 'sports':
      return band(
        aperture <= 4 ? 'good' : aperture <= 5.6 ? 'warn' : 'bad',
        'f/2.8–f/4',
        '运动把光圈开大，是为了把快门留在 1/1000 左右。',
        `当前 f/${formatF(aperture)} 偏小，快门或 ISO 会顶不住。`,
      )
  }
}

function band(
  status: CheckStatus,
  suggested: string,
  goodReason: string,
  badReason: string,
): { status: CheckStatus; suggested: string; reason: string } {
  return {
    status,
    suggested,
    reason: status === 'good' ? goodReason : badReason,
  }
}

function pointsFor(weight: number, status: CheckStatus): number {
  if (status === 'good') return weight
  if (status === 'warn') return Math.round(weight * 0.55)
  return Math.round(weight * 0.2)
}

function trim(value: number): number {
  return Math.round(value * 10) / 10
}
