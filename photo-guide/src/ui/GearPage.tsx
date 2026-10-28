import { cameraLabel, cameras, sensorLabel } from '../data/cameras.ts'
import { lenses } from '../data/lenses.ts'
import type { Sensor } from '../data/types.ts'

const SENSOR_ORDER: Sensor[] = ['ff', 'apsc', 'm43']

export function GearPage() {
  const named = cameras.filter((camera) => camera.brand !== '不确定')
  return (
    <div className="stack">
      <p className="lede">查参数从场景进。这里只是把第一版收录的机身和镜头摊开，不是完整器材库。</p>
      {SENSOR_ORDER.map((sensor) => (
        <section key={sensor}>
          <h2>{sensorLabel[sensor]}</h2>
          <ul className="gear-list">
            {named
              .filter((camera) => camera.sensor === sensor)
              .map((camera) => (
                <li key={camera.id}>
                  <strong>{cameraLabel(camera)}</strong>
                  <span>裁切 {camera.cropFactor}x</span>
                </li>
              ))}
          </ul>
        </section>
      ))}
      <section>
        <h2>镜头</h2>
        <ul className="gear-list">
          {lenses.map((lens) => (
            <li key={lens.id}>
              <strong>{lens.name}</strong>
              <span>{lens.kind === 'prime' ? '定焦' : `${lens.focalMin}–${lens.focalMax}mm 变焦`}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
