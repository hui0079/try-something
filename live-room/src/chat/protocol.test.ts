import { describe, expect, it } from 'vitest'
import {
  MAX_HISTORY,
  MAX_NAME_LENGTH,
  MAX_TEXT_LENGTH,
  parseClientMessage,
  parseServerMessage,
  sanitizeName,
  sanitizeText,
} from './protocol.ts'

describe('sanitizeName', () => {
  it('falls back when the name is empty', () => {
    expect(sanitizeName('')).toBe('观众')
    expect(sanitizeName('   ')).toBe('观众')
    expect(sanitizeName(null)).toBe('观众')
  })

  it('collapses whitespace and keeps the first 24 characters', () => {
    expect(sanitizeName('  张   三  ')).toBe('张 三')
    const long = '名'.repeat(MAX_NAME_LENGTH + 8)
    expect([...sanitizeName(long)]).toHaveLength(MAX_NAME_LENGTH)
  })
})

describe('sanitizeText', () => {
  it('rejects blank messages', () => {
    expect(sanitizeText('')).toBeNull()
    expect(sanitizeText('  \n  ')).toBeNull()
    expect(sanitizeText(12)).toBeNull()
  })

  it('trims and caps a message at 200 characters', () => {
    expect(sanitizeText('  你好  呀  ')).toBe('你好 呀')
    const long = '字'.repeat(MAX_TEXT_LENGTH + 20)
    expect([...sanitizeText(long)!]).toHaveLength(MAX_TEXT_LENGTH)
  })
})

describe('parseClientMessage', () => {
  it('accepts join and chat payloads', () => {
    expect(parseClientMessage({ type: 'join', name: '阿禾' })).toEqual({ type: 'join', name: '阿禾' })
    expect(parseClientMessage({ type: 'chat', text: '在吗' })).toEqual({ type: 'chat', text: '在吗' })
  })

  it('rejects malformed payloads', () => {
    expect(parseClientMessage(null)).toBeNull()
    expect(parseClientMessage({ type: 'join' })).toBeNull()
    expect(parseClientMessage({ type: 'chat', text: 1 })).toBeNull()
    expect(parseClientMessage({ type: 'presence', count: 1 })).toBeNull()
  })
})

describe('parseServerMessage', () => {
  it('accepts presence, chat, and history', () => {
    expect(parseServerMessage({ type: 'presence', count: 2 })).toEqual({ type: 'presence', count: 2 })
    expect(parseServerMessage({ type: 'chat', name: '阿禾', text: '在', ts: 1 })).toEqual({
      type: 'chat',
      name: '阿禾',
      text: '在',
      ts: 1,
    })
    const messages = [{ name: '阿禾', text: '在', ts: 1 }]
    expect(parseServerMessage({ type: 'history', messages })).toEqual({ type: 'history', messages })
  })

  it('rejects a history entry that is not a chat line', () => {
    expect(parseServerMessage({ type: 'history', messages: [{ name: '阿禾' }] })).toBeNull()
    expect(parseServerMessage({ type: 'presence', count: Number.NaN })).toBeNull()
  })
})

describe('limits', () => {
  it('keeps about two hundred lines', () => {
    expect(MAX_HISTORY).toBe(200)
  })
})
