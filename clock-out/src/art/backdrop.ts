import Phaser from 'phaser'
import type { RoomId } from '../game/rooms'
import { PAL } from './palette'

function rect(g: Phaser.GameObjects.Graphics, color: number, x: number, y: number, w: number, h: number): void {
  g.fillStyle(color, 1)
  g.fillRect(x, y, w, h)
}

function shell(g: Phaser.GameObjects.Graphics, wall: number): void {
  rect(g, wall, 0, 0, 320, 192)
  rect(g, PAL.stoneDark, 0, 0, 320, 10)
  rect(g, PAL.floorDark, 0, 168, 320, 24)
  for (let y = 28; y < 160; y += 28) rect(g, PAL.stoneDark, 16, y, 288, 2)
}

function window(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
  rect(g, PAL.ink, x, y, w, h)
  rect(g, PAL.glass, x + 2, y + 2, w - 4, h - 4)
  rect(g, PAL.glassHi, x + 3, y + 3, 3, 3)
  rect(g, PAL.stoneHi, x + w / 2 - 1, y, 2, h)
}

const ROOMS: RoomId[] = ['gate', 'court', 'hall', 'chapel', 'library', 'clock', 'crypt', 'throne', 'roof']

export function buildBackdrops(scene: Phaser.Scene): void {
  for (const id of ROOMS) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false)
    paint(g, id)
    g.generateTexture(`bg-${id}`, 320, 192)
    g.destroy()
  }
}

function paint(g: Phaser.GameObjects.Graphics, id: RoomId): void {
  if (id === 'roof') {
    rect(g, PAL.night, 0, 0, 320, 192)
    rect(g, PAL.nightMid, 0, 90, 320, 102)
    rect(g, PAL.moon, 230, 28, 28, 28)
    rect(g, PAL.white, 238, 34, 8, 8)
    for (const star of [20, 60, 110, 160, 200, 280]) rect(g, PAL.white, star, 20 + (star % 40), 2, 2)
    rect(g, PAL.stoneDark, 0, 150, 320, 42)
    return
  }
  shell(g, id === 'chapel' ? 0x2a2038 : id === 'crypt' ? 0x241820 : id === 'throne' ? 0x301820 : PAL.stone)
  if (id === 'gate') {
    window(g, 220, 28, 28, 36)
    window(g, 262, 28, 28, 36)
  }
  if (id === 'court') {
    window(g, 40, 36, 36, 48)
    window(g, 250, 36, 36, 48)
    rect(g, PAL.moon, 150, 40, 16, 16)
  }
  if (id === 'hall') {
    rect(g, PAL.cape, 36, 28, 16, 48)
    rect(g, PAL.gold, 40, 36, 8, 10)
    rect(g, PAL.cape, 268, 28, 16, 48)
    rect(g, PAL.gold, 272, 36, 8, 10)
  }
  if (id === 'chapel') {
    window(g, 120, 28, 80, 70)
    rect(g, PAL.gold, 154, 40, 12, 28)
  }
  if (id === 'library') {
    for (let x = 28; x < 280; x += 36) {
      rect(g, PAL.wood, x, 36, 28, 70)
      rect(g, PAL.blood, x + 3, 42, 6, 16)
      rect(g, PAL.coat, x + 12, 48, 6, 18)
      rect(g, PAL.gold, x + 20, 44, 5, 14)
    }
  }
  if (id === 'clock') {
    rect(g, PAL.floorDark, 108, 36, 100, 100)
    rect(g, PAL.gold, 118, 46, 80, 80)
    rect(g, PAL.ink, 124, 52, 68, 68)
    rect(g, PAL.gold, 156, 58, 4, 28)
    rect(g, PAL.gold, 156, 84, 22, 3)
  }
  if (id === 'crypt') {
    rect(g, PAL.stoneDark, 40, 100, 70, 28)
    rect(g, PAL.stoneDark, 200, 100, 70, 28)
    rect(g, PAL.bone, 62, 90, 8, 10)
    rect(g, PAL.moss, 0, 150, 320, 8)
  }
  if (id === 'throne') {
    rect(g, PAL.blood, 0, 150, 320, 18)
    rect(g, PAL.gold, 200, 78, 70, 50)
    rect(g, PAL.floorDark, 210, 88, 50, 30)
    rect(g, PAL.cape, 228, 70, 16, 20)
  }
}
