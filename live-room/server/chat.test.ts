import { describe, expect, it } from 'vitest'
import { MAX_HISTORY } from '../src/chat/protocol.ts'
import { ChatRoom } from './chat.ts'

describe('ChatRoom', () => {
  it('ignores chat before join and blank text', () => {
    const room = new ChatRoom()
    expect(room.say('a', '你好')).toBeNull()
    room.join('a', '阿禾')
    expect(room.say('a', '   ')).toBeNull()
  })

  it('stores a line under the sanitized name', () => {
    const room = new ChatRoom()
    room.join('a', '  阿禾  ')
    expect(room.say('a', '  在吗  ', 10)).toEqual({ name: '阿禾', text: '在吗', ts: 10 })
    expect(room.size).toBe(1)
  })

  it('sends history only on the first join and renames in place', () => {
    const room = new ChatRoom()
    room.join('a', '阿禾')
    room.say('a', '第一句', 1)
    const again = room.join('a', '小禾')
    expect(again.first).toBe(false)
    expect(again.history).toEqual([])
    expect(room.say('a', '第二句', 2)?.name).toBe('小禾')

    const next = room.join('b', '观众')
    expect(next.first).toBe(true)
    expect(next.history.map((line) => line.text)).toEqual(['第一句', '第二句'])
  })

  it('drops the oldest line past 200 and forgets a member on leave', () => {
    const room = new ChatRoom()
    room.join('a', '阿禾')
    for (let i = 0; i < MAX_HISTORY + 5; i++) room.say('a', `m${i}`, i)
    const late = room.join('b', '观众')
    expect(late.history).toHaveLength(MAX_HISTORY)
    expect(late.history[0]?.text).toBe('m5')
    room.leave('a')
    expect(room.size).toBe(1)
    expect(room.say('a', '还在')).toBeNull()
  })
})
