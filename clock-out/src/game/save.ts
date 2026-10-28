import { isRelic, isRoomId, type Relic, type RoomId } from './rooms'

export const SAVE_KEY = 'night-watch-save'

export interface SaveData {
  relics: Relic[]
  checkpoint: RoomId
  bossDead: boolean
  visited: RoomId[]
  xp: number
  hearts: number
}

export interface SaveStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function defaultSave(): SaveData {
  return { relics: [], checkpoint: 'gate', bossDead: false, visited: ['gate'], xp: 0, hearts: 8 }
}

export function parseSave(raw: string | null): SaveData {
  const empty = defaultSave()
  if (!raw) return empty
  try {
    const data = JSON.parse(raw) as Partial<SaveData>
    const relics = Array.isArray(data.relics) ? data.relics.filter(isRelic) : []
    const checkpoint = isRoomId(data.checkpoint) ? data.checkpoint : 'gate'
    const visited: RoomId[] = Array.isArray(data.visited) ? data.visited.filter(isRoomId) : ['gate']
    if (!visited.includes(checkpoint)) visited.push(checkpoint)
    if (!visited.includes('gate')) visited.unshift('gate')
    const xp = typeof data.xp === 'number' && data.xp > 0 ? Math.floor(data.xp) : 0
    const hearts = typeof data.hearts === 'number' ? Math.max(0, Math.min(30, Math.floor(data.hearts))) : empty.hearts
    return { relics, checkpoint, bossDead: Boolean(data.bossDead), visited, xp, hearts }
  } catch {
    return empty
  }
}

export function readSave(storage: SaveStorage): SaveData {
  try {
    return parseSave(storage.getItem(SAVE_KEY))
  } catch {
    return defaultSave()
  }
}

export function writeSave(storage: SaveStorage, save: SaveData): void {
  storage.setItem(SAVE_KEY, JSON.stringify(save))
}
