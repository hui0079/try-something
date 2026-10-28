import { describe, expect, it } from 'vitest'
import { defaultSave, parseSave, readSave, writeSave } from './save'

describe('save', () => {
  it('drops a broken save back to the gate', () => {
    expect(parseSave(null)).toEqual(defaultSave())
    expect(parseSave('nope').checkpoint).toBe('gate')
    expect(parseSave(JSON.stringify({ relics: ['boots', 'stapler'], checkpoint: 'lobby', xp: 18, hearts: 3 })).relics).toEqual(['boots'])
  })

  it('round-trips through storage', () => {
    const memory = new Map<string, string>()
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => void memory.set(key, value),
    }
    const save = { ...defaultSave(), relics: ['cloak' as const], xp: 30, hearts: 4, visited: ['gate' as const, 'hall' as const] }
    writeSave(storage, save)
    expect(readSave(storage)).toEqual(save)
  })
})
