import { describe, expect, it } from 'vitest'
import type { PhotoExif } from '../data/types.ts'
import { readPhotoExif } from './exif.ts'
import { analyzePixels } from './pixels.ts'
import { scoreHeadline, scorePhoto } from './score.ts'

const portraitOff: PhotoExif = {
  make: 'SONY',
  model: 'ILCE-7M4',
  lens: 'FE 85mm F1.8',
  aperture: 8,
  shutter: 1 / 30,
  iso: 12800,
  focalLength: 85,
  focalLength35mm: 85,
}

const portraitOk: PhotoExif = {
  ...portraitOff,
  aperture: 2,
  shutter: 1 / 250,
  iso: 200,
}

describe('scorePhoto', () => {
  it('refuses a photo that is missing core fields', () => {
    const result = scorePhoto({ aperture: 2, shutter: 1 / 125, iso: 200 }, 'portrait')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toContain('这张没有拍摄参数')
      expect(result.missing).toEqual(['焦距'])
    }
  })

  it('marks a mismatched portrait low on shutter, ISO, and aperture', () => {
    const result = scorePhoto(portraitOff, 'portrait')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.total).toBe(21)
    expect(result.checks.map((check) => check.status)).toEqual(['bad', 'bad', 'bad'])
    const shutter = result.checks[0]
    expect(shutter?.current).toBe('1/30')
    expect(shutter?.suggested).toContain('1/125')
    expect(shutter?.reason).toContain('1/85')
    expect(result.checks[1]?.suggested).toContain('3200')
    expect(result.checks[2]?.suggested).toContain('f/1.8')
  })

  it('gives a matching portrait a full score', () => {
    const result = scorePhoto(portraitOk, 'portrait')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.total).toBe(100)
    expect(result.headline).toBe(scoreHeadline(100))
  })

  it('scores from the photo settings when the body is missing', () => {
    const withoutBody = scorePhoto(
      {
        lens: 'FE 85mm F1.8',
        aperture: 8,
        shutter: 1 / 30,
        iso: 12800,
        focalLength: 85,
      },
      'portrait',
    )
    const withBody = scorePhoto(portraitOff, 'portrait')
    expect(withoutBody.ok && withBody.ok).toBe(true)
    if (!withoutBody.ok || !withBody.ok) return
    expect(withoutBody.total).toBe(withBody.total)
    expect(withoutBody.checks.map((check) => check.status)).toEqual(['bad', 'bad', 'bad'])
  })

  it('uses the photo equivalent focal length and ignores the camera name', () => {
    const result = scorePhoto(
      {
        model: 'Mystery Body',
        aperture: 2,
        shutter: 1 / 40,
        iso: 800,
        focalLength: 50,
        focalLength35mm: 75,
      },
      'portrait',
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.checks.find((check) => check.id === 'shutter')?.reason).toContain('1/75')
    expect(JSON.stringify(result)).not.toContain('APS-C')
  })

  it('flags a wide-open landscape and a slow sports shutter', () => {
    const landscape = scorePhoto(
      { ...portraitOk, aperture: 1.4, shutter: 1 / 125, iso: 100, focalLength: 24, focalLength35mm: 24 },
      'landscape',
    )
    const sports = scorePhoto(
      { ...portraitOk, aperture: 2.8, shutter: 1 / 200, iso: 800, focalLength: 200, focalLength35mm: 200 },
      'sports',
    )
    expect(landscape.ok && landscape.checks.find((check) => check.id === 'aperture')?.status).toBe('bad')
    expect(sports.ok && sports.checks.find((check) => check.id === 'shutter')?.status).toBe('bad')
  })

  it('scores the picture when the file has no exposure data', () => {
    const result = scorePhoto({}, 'portrait', analyzePixels(48, 48, solid(48, 48, 140)))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.note).toContain('只看画面')
    expect(scoreHeadline(100, true)).toBe('画面和构图都站得住')
    expect(result.checks.map((check) => check.id)).toEqual(['exposure', 'sharpness', 'composition'])
    expect(result.checks.find((check) => check.id === 'sharpness')?.status).toBe('bad')
  })

  it('reads exposure, sharpness, and where the subject sits', () => {
    const bright = scorePhoto(portraitOk, 'portrait', analyzePixels(48, 48, solid(48, 48, 252)))
    const placed = scorePhoto(portraitOk, 'landscape', analyzePixels(48, 48, square(48, 48, 14, 14)))
    const edged = scorePhoto(portraitOk, 'street', analyzePixels(48, 48, square(48, 48, 0, 20)))
    expect(bright.ok && bright.checks.find((check) => check.id === 'exposure')?.status).toBe('bad')
    expect(placed.ok && placed.checks.find((check) => check.id === 'composition')?.status).toBe('good')
    expect(edged.ok && edged.checks.find((check) => check.id === 'composition')?.status).toBe('bad')
    expect(placed.ok && placed.checks.find((check) => check.id === 'sharpness')?.status).toBe('good')
  })

  it('calls a tilted horizon out of level', () => {
    const tilted = scorePhoto({}, 'landscape', analyzePixels(48, 48, horizon(48, 48, 12, 34)))
    expect(tilted.ok && tilted.checks.find((check) => check.id === 'composition')?.current).toBe('地平线是斜的')
  })

  it('does not treat converging building edges as a crooked horizon', () => {
    const building = scorePhoto({}, 'landscape', analyzePixels(48, 48, convergingBuilding(48, 48)))
    expect(building.ok && building.checks.find((check) => check.id === 'composition')?.current).not.toBe('地平线是斜的')
  })
})

function solid(width: number, height: number, value: number): Uint8ClampedArray {
  return paint(width, height, () => [value, value, value])
}

function square(width: number, height: number, left: number, top: number): Uint8ClampedArray {
  return paint(width, height, (x, y) => {
    const inside = x >= left && x < left + 12 && y >= top && y < top + 12
    return inside ? [250, 250, 250] : [20, 20, 20]
  })
}

function horizon(width: number, height: number, leftRow: number, rightRow: number): Uint8ClampedArray {
  return paint(width, height, (x, y) => {
    const split = leftRow + ((rightRow - leftRow) * x) / Math.max(1, width - 1)
    return y < split ? [210, 220, 235] : [30, 50, 30]
  })
}

function convergingBuilding(width: number, height: number): Uint8ClampedArray {
  return paint(width, height, (x, y) => {
    const split = 14 + (18 * x) / Math.max(1, width - 1)
    const sky = y < split
    const t = y / Math.max(1, height - 1)
    const left = 16 + (8 - 16) * t
    const right = 32 + (40 - 32) * t
    const column = (x >= left && x <= left + 4) || (x >= right && x <= right + 4)
    if (column) return [240, 236, 228]
    return sky ? [150, 170, 190] : [40, 48, 36]
  })
}

function paint(
  width: number,
  height: number,
  color: (x: number, y: number) => [number, number, number],
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4
      const [red, green, blue] = color(x, y)
      data[offset] = red
      data[offset + 1] = green
      data[offset + 2] = blue
      data[offset + 3] = 255
    }
  }
  return data
}

describe('readPhotoExif', () => {
  it('returns an empty record when the file has no metadata', async () => {
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47])
    await expect(readPhotoExif(png)).resolves.toEqual({})
  })

  it('reads aperture, shutter, ISO, and body from a camera JPEG', async () => {
    const { readFileSync } = await import('node:fs')
    const jpeg = readFileSync(new URL('../../public/samples/portrait-off.jpg', import.meta.url))
    const exif = await readPhotoExif(jpeg)
    expect(exif).toMatchObject({
      model: 'ILCE-7M4',
      aperture: 8,
      iso: 12800,
      focalLength: 85,
    })
    expect(exif.shutter).toBeCloseTo(1 / 30)
  })
})
