export type PixelStats = {
  meanLuma: number
  clipHigh: number
  clipLow: number
  sharpness: number
  detail: number
  subjectX: number
  subjectY: number
  hasHorizon: boolean
  horizonTilt: number
  verticalsConverge: boolean
}

export function analyzePixels(width: number, height: number, rgba: Uint8ClampedArray): PixelStats {
  const count = Math.max(1, width * height)
  const luma = new Float64Array(count)
  let lumaSum = 0
  let clipHigh = 0
  let clipLow = 0

  for (let index = 0; index < count; index += 1) {
    const offset = index * 4
    const value = rgba[offset]! * 0.2126 + rgba[offset + 1]! * 0.7152 + rgba[offset + 2]! * 0.0722
    luma[index] = value
    lumaSum += value
    if (value >= 250) clipHigh += 1
    if (value <= 5) clipLow += 1
  }

  let lapSum = 0
  let lapSquare = 0
  let lapCount = 0
  let weight = 0
  let weightX = 0
  let weightY = 0

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x
      const lap =
        luma[index]! * 4 -
        luma[index - 1]! -
        luma[index + 1]! -
        luma[index - width]! -
        luma[index + width]!
      lapSum += lap
      lapSquare += lap * lap
      lapCount += 1
      const magnitude = Math.abs(lap)
      if (magnitude < 8) continue
      weight += magnitude
      weightX += x * magnitude
      weightY += y * magnitude
    }
  }

  const meanLap = lapCount > 0 ? lapSum / lapCount : 0
  const sharpness = lapCount > 0 ? lapSquare / lapCount - meanLap * meanLap : 0
  const horizon = readHorizon(width, height, luma)

  return {
    meanLuma: lumaSum / count / 255,
    clipHigh: clipHigh / count,
    clipLow: clipLow / count,
    sharpness,
    detail: weight / count,
    subjectX: weight > 0 ? weightX / weight / Math.max(1, width - 1) : 0.5,
    subjectY: weight > 0 ? weightY / weight / Math.max(1, height - 1) : 0.5,
    hasHorizon: horizon.present,
    horizonTilt: horizon.tilt,
    verticalsConverge: verticalsConverge(width, height, luma),
  }
}

function readHorizon(width: number, height: number, luma: Float64Array): { present: boolean; tilt: number } {
  if (width < 8 || height < 8) return { present: false, tilt: 0 }
  const strips = 8
  const rows: number[] = []
  let strong = 0
  for (let strip = 0; strip < strips; strip += 1) {
    const x0 = Math.floor((strip * width) / strips)
    const x1 = Math.max(x0 + 1, Math.floor(((strip + 1) * width) / strips))
    const edge = strongestRow(luma, width, height, x0, x1)
    rows.push(edge.row)
    if (edge.strength > 12) strong += 1
  }
  if (strong < strips - 2) return { present: false, tilt: 0 }
  for (let strip = 1; strip < strips; strip += 1) {
    if (Math.abs(rows[strip]! - rows[strip - 1]!) / height > 0.12) return { present: false, tilt: 0 }
  }
  return { present: true, tilt: Math.abs(rows[strips - 1]! - rows[0]!) / height }
}

function verticalsConverge(width: number, height: number, luma: Float64Array): boolean {
  if (width < 8 || height < 8) return false
  const top = edgeSpacing(luma, width, height, Math.floor(height * 0.08), Math.floor(height * 0.4))
  const bottom = edgeSpacing(luma, width, height, Math.floor(height * 0.6), Math.floor(height * 0.92))
  if (top == null || bottom == null) return false
  return Math.abs(top - bottom) / width > 0.08
}

function edgeSpacing(
  luma: Float64Array,
  width: number,
  height: number,
  y0: number,
  y1: number,
): number | null {
  const span = Math.max(1, Math.min(height, y1) - Math.max(0, y0))
  const strength = new Float64Array(width)
  for (let y = Math.max(0, y0); y < Math.min(height, y1); y += 1) {
    for (let x = 1; x < width; x += 1) {
      strength[x] += Math.abs(luma[y * width + x]! - luma[y * width + x - 1]!)
    }
  }
  const peaks: number[] = []
  for (let x = 2; x < width - 2; x += 1) {
    const value = strength[x]! / span
    if (value < 18) continue
    if (value >= strength[x - 1]! / span && value > strength[x + 1]! / span) peaks.push(x)
  }
  if (peaks.length < 2) return null
  return peaks[peaks.length - 1]! - peaks[0]!
}

function strongestRow(
  luma: Float64Array,
  width: number,
  height: number,
  x0: number,
  x1: number,
): { row: number; strength: number } {
  const span = Math.max(1, x1 - x0)
  const rows = new Float64Array(height)
  for (let y = 0; y < height; y += 1) {
    let sum = 0
    for (let x = x0; x < x1; x += 1) sum += luma[y * width + x]!
    rows[y] = sum / span
  }
  let bestRow = 1
  let best = 0
  for (let y = 1; y < height; y += 1) {
    const delta = Math.abs(rows[y]! - rows[y - 1]!)
    if (delta > best) {
      best = delta
      bestRow = y
    }
  }
  return { row: bestRow, strength: best }
}
