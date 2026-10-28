import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const jpeg = require('jpeg-js')
const piexif = require('piexifjs')

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'samples')
mkdirSync(root, { recursive: true })

function fill(width, height, rgb) {
  const data = Buffer.alloc(width * height * 4)
  for (let i = 0; i < width * height; i += 1) {
    const offset = i * 4
    data[offset] = rgb[0]
    data[offset + 1] = rgb[1]
    data[offset + 2] = rgb[2]
    data[offset + 3] = 255
  }
  return data
}

function rect(data, width, x0, y0, x1, y1, rgb) {
  const height = data.length / 4 / width
  const left = Math.max(0, x0)
  const top = Math.max(0, y0)
  const right = Math.min(width, x1)
  const bottom = Math.min(height, y1)
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const offset = (y * width + x) * 4
      data[offset] = rgb[0]
      data[offset + 1] = rgb[1]
      data[offset + 2] = rgb[2]
    }
  }
}

function encode(data, width, height) {
  return jpeg.encode({ data, width, height }, 92).data
}

function stripes(data, width, x0, y0, x1, y1, rgb) {
  for (let x = x0; x < x1; x += 8) rect(data, width, x, y0, x + 3, y1, rgb)
}

function portraitOk(width, height) {
  const data = fill(width, height, [92, 78, 68])
  rect(data, width, 168, 150, 312, 340, [214, 186, 166])
  stripes(data, width, 176, 160, 304, 320, [150, 96, 72])
  rect(data, width, 196, 210, 228, 228, [40, 32, 28])
  rect(data, width, 252, 210, 284, 228, [40, 32, 28])
  return encode(data, width, height)
}

function portraitOff(width, height) {
  const data = fill(width, height, [12, 10, 8])
  rect(data, width, 0, 170, 56, 430, [220, 200, 180])
  rect(data, width, 16, 230, 40, 246, [20, 16, 12])
  return encode(data, width, height)
}

function noExif(width, height) {
  const data = fill(width, height, [78, 96, 108])
  rect(data, width, 150, 160, 250, 300, [230, 214, 190])
  stripes(data, width, 158, 168, 242, 288, [160, 110, 80])
  rect(data, width, 175, 205, 205, 220, [30, 28, 26])
  return encode(data, width, height)
}

function withExif(jpegBuffer, tags) {
  const dataUrl = `data:image/jpeg;base64,${Buffer.from(jpegBuffer).toString('base64')}`
  const zeroth = {}
  const exif = {}
  zeroth[piexif.ImageIFD.Make] = tags.make
  zeroth[piexif.ImageIFD.Model] = tags.model
  exif[piexif.ExifIFD.FNumber] = tags.fNumber
  exif[piexif.ExifIFD.ExposureTime] = tags.exposure
  exif[piexif.ExifIFD.ISOSpeedRatings] = tags.iso
  exif[piexif.ExifIFD.FocalLength] = tags.focal
  exif[piexif.ExifIFD.FocalLengthIn35mmFilm] = tags.focal35
  exif[piexif.ExifIFD.LensModel] = tags.lens
  const dumped = piexif.dump({ '0th': zeroth, Exif: exif })
  const inserted = piexif.insert(dumped, dataUrl)
  return Buffer.from(inserted.split(',')[1], 'base64')
}

const baseOk = portraitOk(480, 600)
const baseOff = portraitOff(480, 600)
const plain = noExif(480, 600)

writeFileSync(
  join(root, 'portrait-off.jpg'),
  withExif(baseOff, {
    make: 'SONY',
    model: 'ILCE-7M4',
    fNumber: [80, 10],
    exposure: [1, 30],
    iso: 12800,
    focal: [85, 1],
    focal35: 85,
    lens: 'FE 85mm F1.8',
  }),
)

writeFileSync(
  join(root, 'portrait-ok.jpg'),
  withExif(baseOk, {
    make: 'SONY',
    model: 'ILCE-7M4',
    fNumber: [20, 10],
    exposure: [1, 250],
    iso: 200,
    focal: [85, 1],
    focal35: 85,
    lens: 'FE 85mm F1.8',
  }),
)

writeFileSync(join(root, 'no-exif.jpg'), plain)

const { parse } = await import('exifr/dist/full.esm.mjs')
const off = await parse(readFileSync(join(root, 'portrait-off.jpg')))
const ok = await parse(readFileSync(join(root, 'portrait-ok.jpg')))
const none = await parse(readFileSync(join(root, 'no-exif.jpg')))
console.log('portrait-ok', {
  Model: ok?.Model,
  FNumber: ok?.FNumber,
  ExposureTime: ok?.ExposureTime,
  ISO: ok?.ISO,
  FocalLength: ok?.FocalLength,
})
console.log('portrait-off', {
  Model: off?.Model,
  FNumber: off?.FNumber,
  ExposureTime: off?.ExposureTime,
  ISO: off?.ISO,
  FocalLength: off?.FocalLength,
})
console.log('no-exif', none ?? null)
