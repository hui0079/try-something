export const MAX_NAME_LENGTH = 24
export const MAX_TEXT_LENGTH = 200
export const MAX_HISTORY = 200

const NAME_FALLBACK = '观众'

export type ChatLine = {
  name: string
  text: string
  ts: number
}

export type ClientMessage =
  | { type: 'join'; name: string }
  | { type: 'chat'; text: string }

export type ServerMessage =
  | { type: 'chat'; name: string; text: string; ts: number }
  | { type: 'presence'; count: number }
  | { type: 'history'; messages: ChatLine[] }

export function sanitizeName(raw: unknown): string {
  const text = typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : ''
  const cut = [...text].slice(0, MAX_NAME_LENGTH).join('').trim()
  return cut || NAME_FALLBACK
}

export function sanitizeText(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const text = raw.replace(/\s+/g, ' ').trim()
  if (!text) return null
  return [...text].slice(0, MAX_TEXT_LENGTH).join('')
}

export function parseClientMessage(raw: unknown): ClientMessage | null {
  if (!raw || typeof raw !== 'object') return null
  const msg = raw as Record<string, unknown>
  if (msg.type === 'join' && typeof msg.name === 'string') {
    return { type: 'join', name: msg.name }
  }
  if (msg.type === 'chat' && typeof msg.text === 'string') {
    return { type: 'chat', text: msg.text }
  }
  return null
}

function isChatLine(raw: unknown): raw is ChatLine {
  if (!raw || typeof raw !== 'object') return false
  const line = raw as Record<string, unknown>
  return typeof line.name === 'string' && typeof line.text === 'string' && typeof line.ts === 'number' && Number.isFinite(line.ts)
}

export function parseServerMessage(raw: unknown): ServerMessage | null {
  if (!raw || typeof raw !== 'object') return null
  const msg = raw as Record<string, unknown>
  if (msg.type === 'presence' && typeof msg.count === 'number' && Number.isFinite(msg.count)) {
    return { type: 'presence', count: msg.count }
  }
  if (msg.type === 'chat' && isChatLine(msg)) {
    return { type: 'chat', name: msg.name, text: msg.text, ts: msg.ts }
  }
  if (msg.type === 'history' && Array.isArray(msg.messages) && msg.messages.every(isChatLine)) {
    return { type: 'history', messages: msg.messages }
  }
  return null
}
