export const FLV_URL = '/media/live/room.flv'
export const HLS_URL = '/media/live/room/index.m3u8'

export async function probeLive(url: string): Promise<boolean> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 2500)
  try {
    const res = await fetch(url, { method: 'GET', cache: 'no-store', signal: ctrl.signal })
    if (!res.ok || !res.body) return false
    const reader = res.body.getReader()
    const { value } = await reader.read()
    await reader.cancel().catch(() => undefined)
    if (!value) return false
    if (url.endsWith('.m3u8')) return new TextDecoder().decode(value).includes('#EXTM3U')
    return value[0] === 0x46 && value[1] === 0x4c && value[2] === 0x56
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}
