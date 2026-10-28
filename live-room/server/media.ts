import { spawn, type ChildProcess } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import ffmpegPath from 'ffmpeg-static'

const require = createRequire(import.meta.url)

type MediaServer = {
  run: () => void
  on: (event: string, listener: (...args: unknown[]) => void) => void
}

type MediaServerCtor = new (config: Record<string, unknown>) => MediaServer

const NodeMediaServer = require('node-media-server') as MediaServerCtor

let started = false
const hlsJobs = new Map<string, ChildProcess>()

export function startMedia(): void {
  if (started) return
  started = true
  if (!ffmpegPath) throw new Error('找不到 ffmpeg，HLS 切片无法启动')
  const ffmpeg = ffmpegPath

  const server = new NodeMediaServer({
    logType: 2,
    rtmp: {
      port: 1935,
      chunk_size: 60000,
      gop_cache: true,
      ping: 30,
      ping_timeout: 60,
    },
    http: {
      port: 8000,
      allow_origin: '*',
      mediaroot: 'media',
      api: false,
    },
  })

  server.on('postPublish', (id, streamPath) => {
    if (typeof id !== 'string' || typeof streamPath !== 'string') return
    setTimeout(() => startHls(ffmpeg, id, streamPath), 200)
  })
  server.on('donePublish', (id) => {
    if (typeof id !== 'string') return
    stopHls(id)
  })
  server.run()
}

function startHls(ffmpeg: string, id: string, streamPath: string) {
  const match = /^\/([^/]+)\/([^/]+)$/.exec(streamPath)
  if (!match) return
  const app = match[1]
  const name = match[2]
  if (!app || !name || app !== 'live') return
  const dir = `media/${app}/${name}`
  mkdirSync(dir, { recursive: true })
  const child = spawn(
    ffmpeg,
    [
      '-y',
      '-i',
      `rtmp://127.0.0.1:1935${streamPath}`,
      '-c',
      'copy',
      '-f',
      'hls',
      '-hls_time',
      '2',
      '-hls_list_size',
      '6',
      '-hls_flags',
      'delete_segments+omit_endlist',
      '-hls_segment_filename',
      `${dir}/seg-%d.ts`,
      `${dir}/index.m3u8`,
    ],
    { windowsHide: true },
  )
  hlsJobs.set(id, child)
  child.on('exit', () => {
    if (hlsJobs.get(id) === child) hlsJobs.delete(id)
  })
}

function stopHls(id: string) {
  const child = hlsJobs.get(id)
  if (!child) return
  hlsJobs.delete(id)
  child.kill()
}
