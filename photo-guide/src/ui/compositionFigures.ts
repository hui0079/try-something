import type { FocalClass, SceneId } from '../data/types.ts'

export type FigureKind =
  | 'portrait-center'
  | 'portrait-offset'
  | 'night-building'
  | 'night-light'
  | 'land-wide'
  | 'land-subject'
  | 'land-layers'
  | 'street-wide'
  | 'street'
  | 'sports'

export function figureKind(scene: SceneId, focal: FocalClass): FigureKind {
  if (scene === 'portrait') return focal === 'wide' ? 'portrait-center' : 'portrait-offset'
  if (scene === 'night') return focal === 'wide' ? 'night-building' : 'night-light'
  if (scene === 'landscape') {
    if (focal === 'wide') return 'land-wide'
    if (focal === 'normal') return 'land-subject'
    return 'land-layers'
  }
  if (scene === 'street') return focal === 'wide' ? 'street-wide' : 'street'
  return 'sports'
}

export function figureCaption(kind: FigureKind): string {
  switch (kind) {
    case 'portrait-center':
      return '人放在中间，眼睛在上三分线'
    case 'portrait-offset':
      return '人靠三分线，视线前方留空'
    case 'night-building':
      return '灯放在三分线，近处竖线可以往上收'
    case 'night-light':
      return '亮处放在三分线，黑色可以留着'
    case 'land-wide':
      return '地平线放在下三分，近处竖线不必平行'
    case 'land-subject':
      return '主体放在三分线，地平线避开正中'
    case 'land-layers':
      return '抽出一层，地平线保持水平'
    case 'street-wide':
      return '前方留空，近处竖线可以不平行'
    case 'street':
      return '人在三分线，招牌别压在脖子上'
    case 'sports':
      return '运动前方留空，地平线放平'
  }
}
