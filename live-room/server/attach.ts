import type { IncomingMessage } from 'node:http'
import type { Duplex } from 'node:stream'
import { WebSocketServer, type RawData, type WebSocket } from 'ws'
import { parseClientMessage, type ServerMessage } from '../src/chat/protocol.ts'
import { ChatRoom } from './chat.ts'

const MAX_PACKET = 4096

type UpgradeServer = {
  on(event: 'upgrade', listener: (req: IncomingMessage, socket: Duplex, head: Buffer) => void): void
}

export function attachChat(httpServer: UpgradeServer): void {
  const room = new ChatRoom()
  const wss = new WebSocketServer({ noServer: true })
  const sockets = new Map<string, WebSocket>()

  httpServer.on('upgrade', (req, socket, head) => {
    const path = (req.url ?? '').split('?')[0]
    if (path !== '/ws') return
    wss.handleUpgrade(req, socket, head, (ws) => {
      const id = crypto.randomUUID()
      sockets.set(id, ws)
      broadcast({ type: 'presence', count: sockets.size })

      ws.on('message', (buf) => {
        const packet = packetText(buf)
        if (packet.length > MAX_PACKET) return
        let raw: unknown
        try {
          raw = JSON.parse(packet)
        } catch {
          return
        }
        const msg = parseClientMessage(raw)
        if (!msg) return
        if (msg.type === 'join') {
          const result = room.join(id, msg.name)
          if (result.first) send(ws, { type: 'history', messages: result.history })
          return
        }
        const line = room.say(id, msg.text)
        if (!line) return
        broadcast({ type: 'chat', name: line.name, text: line.text, ts: line.ts })
      })

      ws.on('close', () => {
        sockets.delete(id)
        room.leave(id)
        broadcast({ type: 'presence', count: sockets.size })
      })
    })
  })

  function broadcast(message: ServerMessage) {
    const data = JSON.stringify(message)
    for (const ws of sockets.values()) {
      if (ws.readyState === ws.OPEN) ws.send(data)
    }
  }

  function send(ws: WebSocket, message: ServerMessage) {
    if (ws.readyState !== ws.OPEN) return
    ws.send(JSON.stringify(message))
  }
}

function packetText(data: RawData): string {
  if (Array.isArray(data)) return Buffer.concat(data).toString('utf8')
  if (Buffer.isBuffer(data)) return data.toString('utf8')
  return Buffer.from(data).toString('utf8')
}
