import type { Scene, SceneId } from './types.ts'

export const scenes: Scene[] = [
  {
    id: 'portrait',
    name: '人像',
    summary: '把人从背景里分离出来',
    hint: '光圈优先',
  },
  {
    id: 'night',
    name: '夜景',
    summary: '先保住快门，再谈干净',
    hint: '光圈开大',
  },
  {
    id: 'landscape',
    name: '风景',
    summary: '从前到后都清楚',
    hint: '收到 f/8',
  },
  {
    id: 'street',
    name: '街拍',
    summary: '提前对好焦，等人走进来',
    hint: '1/250 起',
  },
  {
    id: 'sports',
    name: '运动',
    summary: '冻结动作，对焦跟着走',
    hint: '1/1000 起',
  },
]

export function sceneById(id: SceneId): Scene {
  const scene = scenes.find((item) => item.id === id)
  if (!scene) throw new Error(`unknown scene ${id}`)
  return scene
}
