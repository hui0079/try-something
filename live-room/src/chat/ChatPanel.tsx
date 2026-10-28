import { useEffect, useRef, useState } from 'react'
import { parseServerMessage, type ChatLine } from './protocol.ts'

const NAME_KEY = 'live-room-name'

function storedName(): string {
  try {
    const existing = sessionStorage.getItem(NAME_KEY)
    if (existing && existing.trim()) return existing
    const name = `观众${Math.floor(1000 + Math.random() * 9000)}`
    sessionStorage.setItem(NAME_KEY, name)
    return name
  } catch {
    return '观众'
  }
}

function rememberName(name: string) {
  try {
    sessionStorage.setItem(NAME_KEY, name)
  } catch {
    // Private mode can reject storage. The live socket still has the name.
  }
}

export function ChatPanel() {
  const [name, setName] = useState(storedName)
  const [draft, setDraft] = useState('')
  const [lines, setLines] = useState<ChatLine[]>([])
  const [count, setCount] = useState(0)
  const [connected, setConnected] = useState(false)
  const sock = useRef<WebSocket | null>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef(name)
  nameRef.current = name

  useEffect(() => {
    let closed = false
    let timer = 0
    let ws: WebSocket | null = null

    const connect = () => {
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
      ws = new WebSocket(`${protocol}//${location.host}/ws`)
      sock.current = ws
      ws.onopen = () => {
        setConnected(true)
        ws?.send(JSON.stringify({ type: 'join', name: nameRef.current }))
      }
      ws.onclose = () => {
        setConnected(false)
        if (!closed) timer = window.setTimeout(connect, 1500)
      }
      ws.onmessage = (event) => {
        let raw: unknown
        try {
          raw = JSON.parse(String(event.data))
        } catch {
          return
        }
        const msg = parseServerMessage(raw)
        if (!msg) return
        if (msg.type === 'history') setLines(msg.messages)
        if (msg.type === 'chat') setLines((prev) => [...prev, { name: msg.name, text: msg.text, ts: msg.ts }])
        if (msg.type === 'presence') setCount(msg.count)
      }
    }

    connect()
    return () => {
      closed = true
      window.clearTimeout(timer)
      ws?.close()
    }
  }, [])

  useEffect(() => {
    const log = logRef.current
    if (!log) return
    log.scrollTop = log.scrollHeight
  }, [lines])

  const send = (payload: { type: 'join'; name: string } | { type: 'chat'; text: string }) => {
    const ws = sock.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify(payload))
  }

  return (
    <aside className="chat">
      <header className="chat-head">
        <h2>聊天</h2>
        <span>{connected ? `${count} 人在线` : '连接中'}</span>
      </header>
      <label className="name">
        昵称
        <input
          value={name}
          maxLength={24}
          onChange={(event) => {
            const next = event.target.value
            setName(next)
            rememberName(next)
          }}
          onBlur={() => send({ type: 'join', name })}
        />
      </label>
      <div className="log" ref={logRef} aria-live="polite">
        {lines.map((line, index) => (
          <p key={`${line.ts}-${index}`}>
            <b>{line.name}</b>
            <span>{line.text}</span>
          </p>
        ))}
      </div>
      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault()
          if (!draft.trim()) return
          send({ type: 'join', name })
          send({ type: 'chat', text: draft })
          setDraft('')
        }}
      >
        <input
          aria-label="聊天内容"
          maxLength={200}
          placeholder="说点什么"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit">发送</button>
      </form>
    </aside>
  )
}
