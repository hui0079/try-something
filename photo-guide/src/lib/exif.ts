import { parse } from 'exifr/dist/lite.esm.mjs'
import type { PhotoExif } from '../data/types.ts'

export async function readPhotoExif(input: Blob | ArrayBuffer | Uint8Array): Promise<PhotoExif> {
  try {
    const raw = await parse(input, { chunked: false })
    if (!raw || typeof raw !== 'object') return {}
    return {
      make: asString(raw.Make),
      model: asString(raw.Model) ?? asString(raw.UniqueCameraModel) ?? asString(raw.CameraModelName),
      lens: asString(raw.LensModel),
      aperture: asNumber(raw.FNumber),
      shutter: asNumber(raw.ExposureTime),
      iso: asNumber(raw.ISO),
      focalLength: asNumber(raw.FocalLength),
      focalLength35mm: asNumber(raw.FocalLengthIn35mmFormat),
    }
  } catch {
    return {}
  }
}

function asString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
  if (Array.isArray(value)) return asNumber(value[0])
  return undefined
}
