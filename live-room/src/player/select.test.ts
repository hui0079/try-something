import { describe, expect, it } from 'vitest'
import { fallbackAfterFlvFailure, selectPlayback } from './select.ts'

const chrome =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const edge = `${chrome} Edg/120.0.0.0`
const safari =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
const iphone =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const wechat =
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 MicroMessenger/8.0.0'

describe('selectPlayback', () => {
  it('uses FLV on desktop Chromium when MediaSource exists', () => {
    expect(selectPlayback({ userAgent: chrome, mediaSource: true })).toBe('flv')
    expect(selectPlayback({ userAgent: edge, mediaSource: true })).toBe('flv')
  })

  it('uses native HLS on Safari, iOS, WeChat, and iPadOS', () => {
    expect(selectPlayback({ userAgent: safari, mediaSource: true })).toBe('native-hls')
    expect(selectPlayback({ userAgent: iphone, mediaSource: false })).toBe('native-hls')
    expect(selectPlayback({ userAgent: wechat, mediaSource: true })).toBe('native-hls')
    expect(selectPlayback({ userAgent: safari, mediaSource: true, maxTouchPoints: 5 })).toBe('native-hls')
  })

  it('uses native HLS when MediaSource is missing', () => {
    expect(selectPlayback({ userAgent: chrome, mediaSource: false })).toBe('native-hls')
  })
})

describe('fallbackAfterFlvFailure', () => {
  it('tries hls.js only before the first frame', () => {
    expect(fallbackAfterFlvFailure(false)).toBe('hls.js')
    expect(fallbackAfterFlvFailure(true)).toBe('offline')
  })
})
