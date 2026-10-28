import { MAX_HISTORY, sanitizeName, sanitizeText, type ChatLine } from '../src/chat/protocol.ts'

export class ChatRoom {
  private history: ChatLine[] = []
  private names = new Map<string, string>()

  join(id: string, rawName: string): { name: string; history: ChatLine[]; first: boolean } {
    const first = !this.names.has(id)
    const name = sanitizeName(rawName)
    this.names.set(id, name)
    return { name, history: first ? [...this.history] : [], first }
  }

  say(id: string, rawText: string, now = Date.now()): ChatLine | null {
    const name = this.names.get(id)
    if (!name) return null
    const text = sanitizeText(rawText)
    if (!text) return null
    const line: ChatLine = { name, text, ts: now }
    this.history.push(line)
    if (this.history.length > MAX_HISTORY) {
      this.history.splice(0, this.history.length - MAX_HISTORY)
    }
    return line
  }

  leave(id: string): void {
    this.names.delete(id)
  }

  get size(): number {
    return this.names.size
  }
}
