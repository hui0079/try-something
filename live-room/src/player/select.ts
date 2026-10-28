export type PlaybackKind = 'flv' | 'native-hls'

export type PlaybackEnv = {
  userAgent: string
  mediaSource: boolean
  maxTouchPoints?: number
}

export function selectPlayback(env: PlaybackEnv): PlaybackKind {
  const ua = env.userAgent
  if (/MicroMessenger/i.test(ua)) return 'native-hls'
  if (/iPhone|iPad|iPod/i.test(ua)) return 'native-hls'
  if (/Macintosh/i.test(ua) && (env.maxTouchPoints ?? 0) > 1) return 'native-hls'
  const safari = /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|Android|Firefox/i.test(ua)
  if (safari) return 'native-hls'
  if (!env.mediaSource) return 'native-hls'
  return 'flv'
}

export function fallbackAfterFlvFailure(sawFrame: boolean): 'hls.js' | 'offline' {
  return sawFrame ? 'offline' : 'hls.js'
}
