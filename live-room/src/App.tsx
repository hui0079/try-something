import { ChatPanel } from './chat/ChatPanel.tsx'
import { Stage } from './player/Stage.tsx'

export default function App() {
  return (
    <main className="room">
      <header className="bar">
        <h1>试播间</h1>
        <p>
          推流 <code>rtmp://127.0.0.1/live</code> · 密钥 <code>room</code>
        </p>
      </header>
      <Stage />
      <ChatPanel />
    </main>
  )
}
