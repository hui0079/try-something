import Phaser from 'phaser'
import { buildBackdrops } from './backdrop'
import { PAL } from './palette'

function stamp(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false)
  draw(g)
  g.generateTexture(key, w, h)
  g.destroy()
}

function rect(g: Phaser.GameObjects.Graphics, color: number, x: number, y: number, w: number, h: number): void {
  g.fillStyle(color, 1)
  g.fillRect(x, y, w, h)
}

function hunter(g: Phaser.GameObjects.Graphics, pose: 'idle' | 'run' | 'jump'): void {
  rect(g, PAL.hair, 5, 2, 6, 3)
  rect(g, PAL.hairHi, 6, 2, 3, 1)
  rect(g, PAL.skin, 6, 5, 4, 3)
  rect(g, PAL.ink, 6, 6, 1, 1)
  rect(g, PAL.ink, 9, 6, 1, 1)
  rect(g, PAL.cape, 3, 8, 3, 8)
  rect(g, PAL.coat, 5, 8, 7, 8)
  rect(g, PAL.coatHi, 5, 8, 2, 8)
  rect(g, PAL.gold, 8, 10, 1, 3)
  rect(g, PAL.pants, 5, 16, 3, pose === 'jump' ? 3 : 5)
  rect(g, PAL.pants, 9, 16, 3, pose === 'jump' ? 3 : 5)
  if (pose === 'run') {
    rect(g, PAL.pantsDark, 5, 19, 3, 2)
    rect(g, PAL.ink, 10, 20, 3, 2)
  } else if (pose === 'idle') {
    rect(g, PAL.ink, 5, 21, 3, 2)
    rect(g, PAL.ink, 9, 21, 3, 2)
  }
  rect(g, PAL.silver, 12, 12, 2, 6)
}

export function buildTextures(scene: Phaser.Scene): void {
  stamp(scene, 'player-idle', 16, 24, (g) => hunter(g, 'idle'))
  stamp(scene, 'player-run', 16, 24, (g) => hunter(g, 'run'))
  stamp(scene, 'player-jump', 16, 24, (g) => hunter(g, 'jump'))
  stamp(scene, 'sword', 22, 6, (g) => {
    rect(g, PAL.gold, 0, 2, 4, 2)
    rect(g, PAL.silver, 4, 1, 16, 3)
    rect(g, PAL.white, 18, 2, 3, 1)
  })
  stamp(scene, 'dagger', 10, 4, (g) => {
    rect(g, PAL.gold, 0, 1, 3, 2)
    rect(g, PAL.silver, 3, 1, 7, 2)
  })
  stamp(scene, 'tile-floor', 16, 16, (g) => {
    rect(g, PAL.floor, 0, 0, 16, 16)
    rect(g, PAL.floorHi, 0, 0, 16, 2)
    rect(g, PAL.floorDark, 0, 14, 16, 2)
    rect(g, PAL.floorDark, 0, 7, 16, 1)
  })
  stamp(scene, 'tile-wall', 16, 16, (g) => {
    rect(g, PAL.stone, 0, 0, 16, 16)
    rect(g, PAL.stoneHi, 0, 0, 2, 16)
    rect(g, PAL.stoneDark, 14, 0, 2, 16)
    rect(g, PAL.stoneDark, 0, 14, 16, 2)
  })
  stamp(scene, 'shadow', 14, 4, (g) => {
    g.fillStyle(PAL.ink, 0.45)
    g.fillEllipse(7, 2, 14, 4)
  })
  stamp(scene, 'skeleton', 16, 24, (g) => {
    rect(g, PAL.bone, 5, 2, 6, 5)
    rect(g, PAL.ink, 6, 4, 1, 1)
    rect(g, PAL.ink, 9, 4, 1, 1)
    rect(g, PAL.boneDark, 6, 8, 4, 2)
    rect(g, PAL.bone, 4, 10, 8, 7)
    rect(g, PAL.bone, 5, 17, 2, 6)
    rect(g, PAL.bone, 9, 17, 2, 6)
    rect(g, PAL.silver, 12, 8, 2, 10)
  })
  stamp(scene, 'bat', 18, 10, (g) => {
    rect(g, PAL.cape, 0, 3, 5, 3)
    rect(g, PAL.cape, 13, 3, 5, 3)
    rect(g, PAL.ink, 5, 2, 8, 6)
    rect(g, PAL.bloodHi, 7, 4, 1, 1)
    rect(g, PAL.bloodHi, 10, 4, 1, 1)
  })
  stamp(scene, 'boss', 40, 36, (g) => {
    rect(g, PAL.cape, 4, 8, 32, 22)
    rect(g, PAL.ink, 10, 2, 20, 8)
    rect(g, PAL.skin, 14, 4, 12, 6)
    rect(g, PAL.blood, 16, 6, 2, 1)
    rect(g, PAL.blood, 22, 6, 2, 1)
    rect(g, PAL.gold, 12, 12, 16, 12)
    rect(g, PAL.silver, 2, 14, 4, 14)
    rect(g, PAL.pants, 14, 24, 5, 10)
    rect(g, PAL.pants, 22, 24, 5, 10)
  })
  stamp(scene, 'boss-hurt', 40, 36, (g) => {
    rect(g, PAL.blood, 4, 8, 32, 22)
    rect(g, PAL.ink, 10, 2, 20, 8)
    rect(g, PAL.bone, 14, 4, 12, 6)
    rect(g, PAL.gold, 12, 12, 16, 12)
    rect(g, PAL.pants, 14, 24, 5, 10)
    rect(g, PAL.pants, 22, 24, 5, 10)
  })
  stamp(scene, 'candle', 8, 16, (g) => {
    rect(g, PAL.flame, 3, 0, 2, 3)
    rect(g, PAL.gold, 2, 2, 4, 2)
    rect(g, PAL.candle, 2, 5, 4, 9)
    rect(g, PAL.floorDark, 1, 14, 6, 2)
  })
  stamp(scene, 'flame', 10, 18, (g) => {
    rect(g, PAL.flame, 3, 0, 4, 4)
    rect(g, PAL.gold, 4, 3, 2, 2)
    rect(g, PAL.blood, 3, 6, 4, 8)
    rect(g, PAL.gold, 2, 14, 6, 3)
  })
  stamp(scene, 'boots', 14, 10, (g) => {
    rect(g, PAL.coat, 1, 3, 5, 5)
    rect(g, PAL.coat, 8, 3, 5, 5)
    rect(g, PAL.gold, 1, 7, 5, 2)
    rect(g, PAL.gold, 8, 7, 5, 2)
  })
  stamp(scene, 'cloak', 14, 14, (g) => {
    rect(g, PAL.cape, 3, 1, 8, 12)
    rect(g, PAL.bloodHi, 4, 2, 2, 8)
    rect(g, PAL.gold, 6, 4, 2, 2)
  })
  stamp(scene, 'badge', 12, 14, (g) => {
    rect(g, PAL.gold, 2, 1, 8, 10)
    rect(g, PAL.blood, 4, 3, 4, 4)
    rect(g, PAL.gold, 5, 11, 2, 2)
  })
  stamp(scene, 'gate', 12, 28, (g) => {
    rect(g, PAL.stoneHi, 1, 0, 3, 28)
    rect(g, PAL.stoneHi, 8, 0, 3, 28)
    rect(g, PAL.gold, 1, 0, 10, 3)
  })
  buildBackdrops(scene)
}
