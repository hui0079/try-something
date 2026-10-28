import { useState } from 'react'
import { cameraById, cameraLabel, cameras, sensorLabel } from '../data/cameras.ts'
import { defaultFocal, focalStops, lensById, lenses } from '../data/lenses.ts'
import { sceneById, scenes } from '../data/scenes.ts'
import type { SceneId } from '../data/types.ts'
import { buildGuide } from '../lib/guide.ts'
import { CompositionFigure } from './CompositionFigure.tsx'

type Step = 'scenes' | 'pick' | 'result'

export function GuideFlow() {
  const [step, setStep] = useState<Step>('scenes')
  const [sceneId, setSceneId] = useState<SceneId>('portrait')
  const [cameraId, setCameraId] = useState('sony-a7m4')
  const [lensId, setLensId] = useState('85-18')
  const [focal, setFocal] = useState(85)

  const scene = sceneById(sceneId)
  const camera = cameraById(cameraId)
  const lens = lensById(lensId)
  const stops = focalStops(lens)
  const guide = buildGuide(scene, camera, lens, focal)

  function chooseScene(next: SceneId) {
    setSceneId(next)
    setStep('pick')
  }

  function chooseLens(nextId: string) {
    const next = lensById(nextId)
    setLensId(nextId)
    setFocal(defaultFocal(next))
  }

  return (
    <div className="stack">
      {step === 'scenes' && (
        <>
          <p className="lede">先选你要拍的场景，再选机身和镜头。参数会按画幅和等效焦距重算。</p>
          <div className="stack">
            {scenes.map((item, index) => (
              <button key={item.id} className="scene" type="button" onClick={() => chooseScene(item.id)}>
                <span>
                  <span className="index">{String(index + 1).padStart(2, '0')}</span>
                  <strong>{item.name}</strong>
                  <span className="summary">{item.summary}</span>
                </span>
                <span className="hint">{item.hint}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 'pick' && (
        <>
          <button className="back" type="button" onClick={() => setStep('scenes')}>
            返回场景
          </button>
          <h2>{scene.name}</h2>
          <p className="lede">
            当前是 {cameraLabel(camera)}，{lens.name}
            {stops.length > 1 ? `，焦距 ${focal}mm` : ''}。不校验卡口，只按焦距、光圈和画幅给建议。
          </p>

          <h3>机身</h3>
          <div className="choices">
            {cameras
              .filter((item) => item.brand !== '不确定')
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={item.id === cameraId ? 'choice is-selected' : 'choice'}
                  onClick={() => setCameraId(item.id)}
                >
                  <strong>
                    {item.brand} {item.name}
                  </strong>
                  <span>
                    {sensorLabel[item.sensor]} · {item.cropFactor}x
                  </span>
                </button>
              ))}
          </div>
          <h3>不确定机身</h3>
          <div className="choices">
            {cameras
              .filter((item) => item.brand === '不确定')
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={item.id === cameraId ? 'choice is-selected' : 'choice'}
                  onClick={() => setCameraId(item.id)}
                >
                  <strong>{item.name}</strong>
                  <span>裁切 {item.cropFactor}x</span>
                </button>
              ))}
          </div>

          <h3>镜头</h3>
          <div className="choices">
            {lenses.map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.id === lensId ? 'choice is-selected' : 'choice'}
                onClick={() => chooseLens(item.id)}
              >
                <strong>{item.name}</strong>
                <span>{item.kind === 'prime' ? '定焦' : '变焦'}</span>
              </button>
            ))}
          </div>

          {stops.length > 1 && (
            <>
              <h3>用在哪一端</h3>
              <div className="chips">
                {stops.map((stop) => (
                  <button
                    key={stop}
                    type="button"
                    className={stop === focal ? 'chip is-selected' : 'chip'}
                    onClick={() => setFocal(stop)}
                  >
                    {stop}mm
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="dock">
            <button className="primary" type="button" onClick={() => setStep('result')}>
              看参数建议
            </button>
          </div>
        </>
      )}

      {step === 'result' && (
        <>
          <button className="back" type="button" onClick={() => setStep('pick')}>
            返回器材
          </button>
          <p className="kicker">
            {guide.sceneName} · {guide.cameraLabel} · {guide.lensLabel}
          </p>
          <h2>参数建议</h2>
          <p className="lede">{guide.lede}</p>
          <dl className="settings">
            <div>
              <dt>光圈</dt>
              <dd>{guide.aperture}</dd>
            </div>
            <div>
              <dt>快门</dt>
              <dd>{guide.shutter}</dd>
            </div>
            <div>
              <dt>ISO</dt>
              <dd>{guide.iso}</dd>
            </div>
            <div>
              <dt>对焦</dt>
              <dd>{guide.focus}</dd>
            </div>
            <div>
              <dt>测光</dt>
              <dd>{guide.metering}</dd>
            </div>
          </dl>
          <h3>构图</h3>
          <CompositionFigure scene={scene.id} focal={guide.focalClass} />
          <ul>
            {guide.composition.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <h3>为什么这样设</h3>
          <ul>
            {guide.why.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <h3>常见翻车</h3>
          <ul>
            {guide.pitfalls.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
