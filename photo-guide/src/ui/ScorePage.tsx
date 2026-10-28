import { useRef, useState } from 'react'
import { scenes } from '../data/scenes.ts'
import type { PhotoExif, SceneId } from '../data/types.ts'
import { readPhotoExif } from '../lib/exif.ts'
import { analyzePixels, type PixelStats } from '../lib/pixels.ts'
import { describeExif, scorePhoto, type ScoreResult } from '../lib/score.ts'

const SAMPLES = [
  { id: 'off', label: '参数偏了的示例', path: '/samples/portrait-off.jpg', scene: 'portrait' as const },
  { id: 'ok', label: '参数合适的示例', path: '/samples/portrait-ok.jpg', scene: 'portrait' as const },
  { id: 'none', label: '没有参数的示例', path: '/samples/no-exif.jpg', scene: 'portrait' as const },
]

export function ScorePage() {
  const [sceneId, setSceneId] = useState<SceneId>('portrait')
  const [preview, setPreview] = useState<string | null>(null)
  const [exif, setExif] = useState<PhotoExif | null>(null)
  const [pixels, setPixels] = useState<PixelStats | null>(null)
  const [result, setResult] = useState<ScoreResult | null>(null)
  const [busy, setBusy] = useState(false)
  const previewUrl = useRef<string | null>(null)
  const requestId = useRef(0)

  async function loadFile(next: File, scene: SceneId) {
    const id = requestId.current + 1
    requestId.current = id
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
    const url = URL.createObjectURL(next)
    previewUrl.current = url
    setPreview(url)
    setBusy(true)
    const parsed = await readPhotoExif(next)
    const image = await readPixelStats(next)
    if (id !== requestId.current) return
    setExif(parsed)
    setPixels(image)
    setResult(scorePhoto(parsed, scene, image))
    setBusy(false)
  }

  function chooseScene(next: SceneId) {
    setSceneId(next)
    if (exif) setResult(scorePhoto(exif, next, pixels))
  }

  async function loadSample(path: string, name: string, scene: SceneId) {
    setSceneId(scene)
    const response = await fetch(path)
    const blob = await response.blob()
    await loadFile(new File([blob], name, { type: blob.type || 'image/jpeg' }), scene)
  }

  const readout = exif ? describeExif(exif) : []

  return (
    <div className="stack">
      <p className="lede">
        看这张照片的明暗、清不清楚，以及主体落在哪。这些是在本地按像素估算的，不是人工点评。有拍摄参数时，再对照你选的场景看光圈、快门和 ISO。不看机身。
      </p>
      <div className="chips" role="group" aria-label="拍摄场景">
        {scenes.map((scene) => (
          <button
            key={scene.id}
            type="button"
            className={scene.id === sceneId ? 'chip is-selected' : 'chip'}
            onClick={() => chooseScene(scene.id)}
          >
            {scene.name}
          </button>
        ))}
      </div>

      <label className="primary file-label">
        从相册选照片
        <input
          className="sr-only"
          type="file"
          accept="image/*"
          onChange={(event) => {
            const next = event.target.files?.[0]
            if (next) void loadFile(next, sceneId)
          }}
        />
      </label>

      <div className="sample-row">
        {SAMPLES.map((sample) => (
          <button
            key={sample.id}
            type="button"
            className="text-button"
            onClick={() => void loadSample(sample.path, `${sample.id}.jpg`, sample.scene)}
          >
            {sample.label}
          </button>
        ))}
      </div>

      {preview && <img className="preview" src={preview} alt="待打分的照片" />}
      {busy && <p className="muted">正在看画面和拍摄参数…</p>}

      {result && !result.ok && (
        <section className="callout">
          <h2>{result.message}</h2>
          <p>{result.detail}</p>
        </section>
      )}

      {result?.ok && (
        <section className="stack">
          <div className="score-head">
            <p className="score-total">
              {result.total}
              <span>/100</span>
            </p>
            <div>
              <h2>{result.headline}</h2>
              {result.note ? <p className="muted">{result.note}</p> : null}
            </div>
          </div>
          {result.checks.map((check) => (
            <article key={check.id} className={`check check-${check.status}`}>
              <header>
                <strong>{check.label}</strong>
                <span>{statusLabel(check.status)}</span>
              </header>
              <p className="arrow">
                <span>{check.current}</span>
                <span aria-hidden="true">→</span>
                <span>{check.suggested}</span>
              </p>
              <p>{check.reason}</p>
            </article>
          ))}
        </section>
      )}

      {readout.length > 0 && (
        <section>
          <h3>读到的参数</h3>
          <dl className="readout">
            {readout.map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  )
}

async function readPixelStats(file: Blob): Promise<PixelStats | null> {
  try {
    const bitmap = await createImageBitmap(file)
    const longEdge = Math.max(bitmap.width, bitmap.height, 1)
    const scale = Math.min(1, 220 / longEdge)
    const width = Math.max(8, Math.round(bitmap.width * scale))
    const height = Math.max(8, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) {
      bitmap.close()
      return null
    }
    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()
    const frame = context.getImageData(0, 0, width, height)
    return analyzePixels(width, height, frame.data)
  } catch {
    return null
  }
}

function statusLabel(status: 'good' | 'warn' | 'bad'): string {
  if (status === 'good') return '合适'
  if (status === 'warn') return '可以再调'
  return '建议改'
}
