import Phaser from 'phaser'
import { PlayScene } from './game/play-scene'
import { PHYS } from './game/player'
import { VIEW_H, VIEW_W } from './game/rooms'
import './style.css'

const params = new URLSearchParams(location.search)

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW_W,
  height: VIEW_H,
  pixelArt: true,
  backgroundColor: '#1a1c2c',
  banner: false,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: PHYS.gravity },
      debug: params.has('debug'),
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: { pixelArt: true, antialias: false, roundPixels: true },
  scene: [PlayScene],
})
