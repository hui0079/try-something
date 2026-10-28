import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { attachChat } from './server/attach.ts'
import { startMedia } from './server/media.ts'

function liveRoomPlugin(): Plugin {
  return {
    name: 'live-room',
    configureServer(server) {
      if (!server.httpServer) return
      attachChat(server.httpServer)
      startMedia()
    },
  }
}

export default defineConfig({
  plugins: [react(), liveRoomPlugin()],
  server: {
    host: true,
    port: 5173,
    watch: {
      ignored: ['**/media/**'],
    },
    proxy: {
      '/media': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/media/, ''),
        timeout: 0,
        proxyTimeout: 0,
      },
    },
  },
})
