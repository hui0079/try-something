import Phaser from 'phaser'
import { buildTextures } from '../art/atlas'
import { Sfx } from './audio'
import { bossSpeed, createBoss, hurtBoss, tickBoss, type BossState } from './boss'
import { patrol } from './enemies'
import { createHud, type Hud } from './hud'
import {
  HEART_MAX,
  PHYS,
  isStomp,
  levelFor,
  maxHp,
  rectsOverlap,
  resolveContact,
  swordBox,
  swordDamage,
  xpSpan,
  type Rect,
} from './player'
import {
  FLOOR_Y,
  ROOMS,
  VIEW_H,
  VIEW_W,
  land,
  opposite,
  passageOpens,
  tryLeave,
  type Dir,
  type FoeSpawn,
  type Pickup,
  type Relic,
  type RoomId,
} from './rooms'
import { readSave, writeSave, type SaveData } from './save'

interface Foe {
  sprite: Phaser.Physics.Arcade.Sprite
  hp: number
  dir: 1 | -1
  left: number
  right: number
  hurt: number
  xp: number
  baseY: number
  kind: FoeSpawn['kind']
}

const RELIC_KEY: Record<Relic, string> = {
  boots: 'flask_blue',
  cloak: 'flask_green',
  badge: 'flask_yellow',
}

const ART = [
  'knight_m_idle_anim_f0', 'knight_m_idle_anim_f1', 'knight_m_idle_anim_f2', 'knight_m_idle_anim_f3',
  'knight_m_run_anim_f0', 'knight_m_run_anim_f1', 'knight_m_run_anim_f2', 'knight_m_run_anim_f3',
  'knight_m_hit_anim_f0',
  'orc_warrior_idle_anim_f0', 'orc_warrior_run_anim_f0', 'orc_warrior_run_anim_f1', 'orc_warrior_run_anim_f2', 'orc_warrior_run_anim_f3',
  'imp_idle_anim_f0', 'imp_idle_anim_f1', 'imp_idle_anim_f2', 'imp_idle_anim_f3',
  'big_demon_idle_anim_f0', 'big_demon_idle_anim_f1', 'big_demon_idle_anim_f2', 'big_demon_idle_anim_f3',
  'big_demon_run_anim_f0', 'big_demon_run_anim_f1',
  'floor_1', 'floor_2', 'floor_3', 'wall_mid', 'wall_left', 'wall_banner_red', 'wall_banner_blue',
  'weapon_knight_sword', 'weapon_knife',
  'flask_red', 'flask_big_red', 'flask_blue', 'flask_green', 'flask_yellow',
  'column', 'crate', 'skull', 'doors_leaf_closed', 'hole',
]

export class PlayScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite
  private sword!: Phaser.GameObjects.Image
  private solids!: Phaser.Physics.Arcade.StaticGroup
  private sfx = new Sfx()
  private hud!: Hud
  private keys!: {
    left: Phaser.Input.Keyboard.Key[]
    right: Phaser.Input.Keyboard.Key[]
    jump: Phaser.Input.Keyboard.Key[]
    attack: Phaser.Input.Keyboard.Key
    dagger: Phaser.Input.Keyboard.Key
    dash: Phaser.Input.Keyboard.Key
    map: Phaser.Input.Keyboard.Key
  }
  private relics = new Set<Relic>()
  private checkpoint: RoomId = 'gate'
  private bossDead = false
  private visited = new Set<RoomId>(['gate'])
  private xp = 0
  private hearts = 8
  private hp = maxHp(1)
  private roomId: RoomId = 'gate'
  private facing: 1 | -1 = 1
  private extraJump = false
  private coyoteUntil = 0
  private jumpBufferUntil = 0
  private dashUntil = 0
  private dashReady = 0
  private attackUntil = 0
  private attackReady = 0
  private daggerReady = 0
  private invulnUntil = 0
  private captionText = ''
  private captionUntil = 0
  private line = ''
  private nearHint = ''
  private mapOpen = false
  private started = false
  private ended = false
  private fading = false
  private guard: Dir | null = null
  private labelWidth = 0
  private local: Phaser.GameObjects.GameObject[] = []
  private foes: Foe[] = []
  private daggers: Phaser.Physics.Arcade.Sprite[] = []
  private candles: Phaser.GameObjects.Image[] = []
  private bossState: BossState | null = null
  private bossSprite: Phaser.Physics.Arcade.Sprite | null = null
  private shadow!: Phaser.GameObjects.Image

  constructor() {
    super('play')
  }

  preload(): void {
    for (const name of ART) this.load.image(name, `/art/0x72/${name}.png`)
  }

  create(): void {
    if (!this.input.keyboard) throw new Error('keyboard unavailable')
    buildTextures(this)
    this.makeAnims()
    this.physics.world.setBounds(0, -80, VIEW_W, 640)
    this.physics.world.gravity.y = PHYS.gravity
    this.cameras.main.setRoundPixels(true)
    this.solids = this.physics.add.staticGroup()
    const keyboard = this.input.keyboard
    const code = Phaser.Input.Keyboard.KeyCodes
    this.keys = {
      left: [keyboard.addKey(code.A), keyboard.addKey(code.LEFT)],
      right: [keyboard.addKey(code.D), keyboard.addKey(code.RIGHT)],
      jump: [keyboard.addKey(code.Z), keyboard.addKey(code.W), keyboard.addKey(code.UP), keyboard.addKey(code.SPACE)],
      attack: keyboard.addKey(code.X),
      dagger: keyboard.addKey(code.C),
      dash: keyboard.addKey(code.SHIFT),
      map: keyboard.addKey(code.M),
    }
    this.player = this.physics.add.sprite(0, 0, 'knight_m_idle_anim_f0')
    this.player.setOrigin(0.5, 1)
    this.player.setCollideWorldBounds(false)
    this.player.setDepth(7)
    this.player.play('knight-idle')
    this.sword = this.add.image(0, 0, 'weapon_knight_sword').setDepth(8).setVisible(false)
    this.shadow = this.add.image(0, 0, 'shadow').setOrigin(0.5, 0.5).setDepth(6)
    const body = this.player.body as Phaser.Physics.Arcade.Body
    body.setSize(12, 16)
    body.setOffset(2, 8)
    body.setMaxVelocity(420, 720)
    this.physics.add.collider(this.player, this.solids)
    const root = document.querySelector('#ui')
    if (!(root instanceof HTMLElement)) throw new Error('missing hud root')
    this.hud = createHud(root)
    const save = readSave(localStorage)
    this.relics = new Set(save.relics)
    this.checkpoint = save.checkpoint
    this.bossDead = save.bossDead
    this.visited = new Set(save.visited)
    this.xp = save.xp
    this.hearts = save.hearts
    this.hp = maxHp(levelFor(this.xp))
    const room = ROOMS[save.checkpoint]
    const spot = room.candles.find((candle) => candle.save) ?? room.entry
    this.enter(save.checkpoint, spot.x, spot.y, null)
  }

  update(time: number, delta: number): void {
    try {
      this.frame(time, delta)
    } finally {
      const span = xpSpan(levelFor(this.xp))
      this.line = time < this.captionUntil ? this.captionText : this.nearHint
      this.hud.update({
        hp: this.hp,
        maxHp: maxHp(levelFor(this.xp)),
        level: levelFor(this.xp),
        xp: this.xp,
        xpNext: span.next,
        hearts: this.hearts,
        relics: [...this.relics],
        line: this.line,
        mapOpen: this.mapOpen,
        roomId: this.roomId,
        visited: [...this.visited],
        bossDead: this.bossDead,
        ended: this.ended,
        started: this.started,
      })
      this.nearHint = ''
    }
  }

  private frame(time: number, delta: number): void {
    const width = this.game.canvas.getBoundingClientRect().width
    if (width > 0 && width !== this.labelWidth) this.layoutLabels()
    const jumpDown = this.keys.jump.some((key) => Phaser.Input.Keyboard.JustDown(key))
    if (!this.started) {
      if (jumpDown) {
        this.started = true
        this.sfx.ding()
      }
      return
    }
    if (!this.ended && Phaser.Input.Keyboard.JustDown(this.keys.map)) this.mapOpen = !this.mapOpen
    if (this.mapOpen || this.ended || this.fading) {
      this.physics.pause()
      this.player.setVelocity(0, 0)
      return
    }
    this.physics.resume()
    this.control(time, jumpDown)
    this.stepFoes(time, delta)
    this.stepBoss(delta)
    this.stepDaggers()
    this.stepCombat(time)
    this.stepFall()
    this.stepEdges()
    this.stepHints()
    this.dressPlayer(time)
    if (ROOMS[this.roomId].ending && this.player.x > 170) {
      this.ended = true
      this.say('夜过去了', 4000)
      this.sfx.ding()
      this.persist()
    }
  }

  private control(time: number, jumpDown: boolean): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body
    const grounded = body.blocked.down
    const left = this.keys.left.some((key) => key.isDown)
    const right = this.keys.right.some((key) => key.isDown)
    const dashing = time < this.dashUntil
    if (grounded) {
      this.extraJump = this.relics.has('boots')
      this.coyoteUntil = time + PHYS.coyoteMs
    }
    if (dashing) this.player.setVelocityX(this.facing * PHYS.dashSpeed)
    else if (left) {
      this.player.setVelocityX(-PHYS.speed)
      this.facing = -1
    } else if (right) {
      this.player.setVelocityX(PHYS.speed)
      this.facing = 1
    } else this.player.setVelocityX(0)
    if (jumpDown) this.jumpBufferUntil = time + PHYS.jumpBufferMs
    if (time < this.jumpBufferUntil && time < this.coyoteUntil) {
      this.launch()
      this.coyoteUntil = 0
    } else if (time < this.jumpBufferUntil && this.extraJump && !grounded) {
      this.extraJump = false
      this.launch()
    }
    const holding = this.keys.jump.some((key) => key.isDown)
    if (!holding && body.velocity.y < -140) this.player.setVelocityY(-140)
    if (Phaser.Input.Keyboard.JustDown(this.keys.dash)) this.tryDash(time)
    if (Phaser.Input.Keyboard.JustDown(this.keys.attack)) this.tryAttack(time)
    if (Phaser.Input.Keyboard.JustDown(this.keys.dagger)) this.tryDagger(time)
    if (time < this.attackUntil) {
      this.player.anims.stop()
      this.player.setTexture('knight_m_hit_anim_f0')
    } else if (left || right) this.player.play('knight-run', true)
    else this.player.play('knight-idle', true)
    this.player.setFlipX(this.facing < 0)
  }

  private launch(): void {
    this.player.setVelocityY(PHYS.jumpSpeed)
    this.jumpBufferUntil = 0
    this.coyoteUntil = 0
    this.sfx.jump()
  }

  private tryDash(time: number): void {
    if (!this.relics.has('cloak') || time < this.dashReady) return
    this.dashUntil = time + PHYS.dashMs
    this.dashReady = time + PHYS.dashCooldownMs
    this.sfx.dash()
  }

  private tryAttack(time: number): void {
    if (time < this.attackReady) return
    this.attackUntil = time + 130
    this.attackReady = time + 340
    this.sfx.hit()
  }

  private tryDagger(time: number): void {
    if (time < this.daggerReady || this.hearts <= 0) return
    this.hearts -= 1
    this.daggerReady = time + 280
    const dagger = this.physics.add.sprite(this.player.x + this.facing * 12, this.player.y - 16, 'weapon_knife')
    dagger.setDepth(8)
    dagger.setAngle(this.facing > 0 ? 90 : -90)
    const body = dagger.body as Phaser.Physics.Arcade.Body
    body.setAllowGravity(false)
    body.setVelocity(this.facing * 240, 0)
    dagger.setFlipX(this.facing < 0)
    this.daggers.push(dagger)
    this.persist()
  }

  private dressPlayer(time: number): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body
    const frame = this.player.frame
    body.setSize(12, 16)
    body.setOffset((frame.width - 12) / 2, frame.height - 16)
    const blinking = time < this.invulnUntil && Math.floor(time / 80) % 2 === 0
    this.player.setAlpha(blinking ? 0.45 : 1)
    this.shadow.setPosition(this.player.x, this.player.y - 1)
    this.shadow.setVisible(body.blocked.down && !blinking)
    const swinging = time < this.attackUntil
    this.sword.setVisible(swinging)
    this.sword.setFlipX(this.facing < 0)
    this.sword.setPosition(this.player.x + this.facing * 10, this.player.y - 6)
  }

  private stepFoes(time: number, delta: number): void {
    for (const foe of this.foes) {
      if (!foe.sprite.active) continue
      foe.hurt = Math.max(0, foe.hurt - delta)
      const turn = patrol(foe.sprite.x, foe.dir, foe.left, foe.right)
      foe.dir = turn.dir
      if (foe.kind === 'bat') {
        foe.sprite.setVelocity(foe.dir * 50, 0)
        foe.sprite.y = foe.baseY + Math.sin(time / 180) * 10
        foe.sprite.play('imp-idle', true)
      } else {
        foe.sprite.setVelocityX(foe.dir * 42)
        foe.sprite.play('orc-run', true)
      }
      foe.sprite.setFlipX(foe.dir < 0)
    }
  }

  private stepBoss(delta: number): void {
    if (!this.bossState || !this.bossSprite || this.bossState.dead) return
    this.bossState = tickBoss(this.bossState, delta)
    const dir = this.player.x < this.bossSprite.x ? -1 : 1
    this.bossSprite.setVelocityX(dir * bossSpeed(this.bossState))
    this.bossSprite.setFlipX(dir > 0)
    this.bossSprite.play(this.bossState.lunge > 0 ? 'demon-run' : 'demon-idle', true)
    this.bossSprite.setTint(this.bossState.phase === 2 ? 0xffb0b0 : 0xffffff)
  }

  private stepDaggers(): void {
    for (const dagger of [...this.daggers]) {
      if (!dagger.active || dagger.x < -12 || dagger.x > VIEW_W + 12) {
        this.removeDagger(dagger)
        continue
      }
      const box = this.bounds(dagger)
      for (const foe of this.foes) {
        if (!foe.sprite.active || !rectsOverlap(box, this.bounds(foe.sprite))) continue
        this.damageFoe(foe, 1)
        this.removeDagger(dagger)
        break
      }
      if (!dagger.active || !this.bossSprite || !this.bossState || this.bossState.dead) continue
      if (rectsOverlap(box, this.bounds(this.bossSprite))) {
        this.damageBoss(1)
        this.removeDagger(dagger)
      }
    }
  }

  private stepCombat(time: number): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body
    const striking = time < this.attackUntil
    const blade = swordBox(this.player.x, this.player.y, this.facing)
    for (const foe of this.foes) {
      if (!foe.sprite.active) continue
      const bounds = this.bounds(foe.sprite)
      const stomping = isStomp(body.velocity.y, this.player.y, bounds.y)
      const bladeHit = striking && rectsOverlap(blade, bounds)
      const touch = rectsOverlap(this.playerBox(), bounds)
      const verdict = resolveContact({ striking: bladeHit, stomping, invulnerable: time < this.invulnUntil })
      if ((bladeHit || stomping) && verdict === 'hurt-enemy') {
        this.damageFoe(foe, stomping ? 1 : swordDamage(levelFor(this.xp)))
        if (stomping) this.player.setVelocityY(PHYS.stompBounce)
      } else if (touch && verdict === 'hurt-player') this.hurt(foe.sprite.x)
    }
    if (this.bossSprite && this.bossState && !this.bossState.dead) {
      const bounds = this.bounds(this.bossSprite)
      const bladeHit = striking && rectsOverlap(blade, bounds)
      if (bladeHit) this.damageBoss(swordDamage(levelFor(this.xp)))
      else if (rectsOverlap(this.playerBox(), bounds)) this.hurt(this.bossSprite.x)
    }
    if (!striking) return
    for (const candle of [...this.candles]) {
      if (rectsOverlap(blade, this.bounds(candle))) this.breakCandle(candle)
    }
  }

  private stepFall(): void {
    if (this.player.y < FLOOR_Y + 48) return
    const shaft = ROOMS[this.roomId].passages.some(
      (passage) => passage.dir === 'down' && this.player.x >= passage.min && this.player.x <= passage.max,
    )
    if (shaft) return
    const room = ROOMS[this.roomId]
    this.player.setPosition(room.entry.x, room.entry.y - 1)
    this.player.setVelocity(0, 0)
    this.hurt()
  }

  private stepEdges(): void {
    const room = ROOMS[this.roomId]
    const leaving = tryLeave(room, this.player.x, this.player.y, this.relics, this.bossDead)
    if (this.guard) {
      if (!leaving || leaving.dir !== this.guard) this.guard = null
      else return
    }
    if (!leaving) {
      if (this.player.x < 18) this.player.x = 18
      if (this.player.x > VIEW_W - 18) this.player.x = VIEW_W - 18
      if (this.player.y < 12) {
        this.player.y = 12
        if ((this.player.body as Phaser.Physics.Arcade.Body).velocity.y < 0) this.player.setVelocityY(0)
      }
      return
    }
    this.travel(leaving)
  }

  private stepHints(): void {
    for (const passage of ROOMS[this.roomId].passages) {
      if (passageOpens(passage, this.relics, this.bossDead)) continue
      const near =
        (passage.dir === 'right' && this.player.x > VIEW_W - 48 && this.player.y > 140) ||
        (passage.dir === 'up' && this.player.y < 80 && this.player.x >= passage.min && this.player.x <= passage.max)
      if (!near) continue
      if (passage.need === 'boots') this.nearHint = '钟楼太高。先去礼拜堂。'
      if (passage.need === 'cloak') this.nearHint = '缺口太宽。先去书库。'
      if (passage.need === 'badge') this.nearHint = '王座还认不出你。'
      if (passage.need === 'boss') this.nearHint = '他还坐在那里。'
    }
  }

  private travel(passage: { dir: Dir; to: RoomId }): void {
    this.fading = true
    const vx = (this.player.body as Phaser.Physics.Arcade.Body).velocity.x
    const vy = (this.player.body as Phaser.Physics.Arcade.Body).velocity.y
    this.physics.pause()
    this.cameras.main.fadeOut(80, 12, 8, 16)
    this.time.delayedCall(80, () => {
      const via = opposite(passage.dir)
      const spot = land(ROOMS[passage.to], via, this.player.x)
      this.enter(passage.to, spot.x, spot.y, via)
      if (via === 'left' || via === 'right') this.player.setVelocity(vx, 0)
      else if (via === 'up') this.player.setVelocity(0, Math.max(vy, 80))
      else this.player.setVelocity(0, 0)
      this.cameras.main.fadeIn(90, 12, 8, 16)
      this.physics.resume()
      this.fading = false
    })
  }

  private enter(id: RoomId, x: number, y: number, via: Dir | null): void {
    this.clearRoom()
    this.roomId = id
    this.ended = false
    this.guard = via
    this.visited.add(id)
    const room = ROOMS[id]
    this.cameras.main.setBackgroundColor(room.bg)
    this.player.setPosition(x, y - 1)
    this.player.setVelocity(0, 0)
    this.invulnUntil = this.time.now + 280
    this.bossState = null
    this.bossSprite = null
    this.paintRoom(id, room.tiles)
    for (let row = 0; row < room.tiles.length; row++) {
      const line = room.tiles[row] ?? ''
      for (let col = 0; col < line.length; col++) {
        if (line[col] !== '#') continue
        const above = row > 0 ? room.tiles[row - 1]?.[col] : '#'
        const key = above === '.' ? ((col + row) % 2 === 0 ? 'floor_1' : 'floor_2') : col % 5 === 0 ? 'wall_left' : 'wall_mid'
        const tile = this.solids.create(col * 16, row * 16, key) as Phaser.Physics.Arcade.Image
        tile.setOrigin(0, 0)
        tile.setDepth(1)
        tile.refreshBody()
      }
    }
    for (const candle of room.candles) this.spawnCandle(candle.x, candle.y, Boolean(candle.save))
    for (const pickup of room.pickups) if (!this.relics.has(pickup.relic)) this.spawnPickup(pickup)
    for (const spawn of room.foes) this.spawnFoe(spawn)
    if (room.boss && !this.bossDead) this.spawnBoss()
    this.layoutLabels()
    this.persist()
  }

  private clearRoom(): void {
    for (const obj of this.local) obj.destroy()
    this.local = []
    this.solids.clear(true, true)
    for (const dagger of this.daggers) dagger.destroy()
    this.daggers = []
    this.foes = []
    this.candles = []
    this.bossSprite = null
    this.bossState = null
  }

  private makeAnims(): void {
    const loop = (key: string, prefix: string, count: number, rate: number) => {
      this.anims.create({
        key,
        frames: Array.from({ length: count }, (_, index) => ({ key: `${prefix}${index}` })),
        frameRate: rate,
        repeat: -1,
      })
    }
    loop('knight-idle', 'knight_m_idle_anim_f', 4, 6)
    loop('knight-run', 'knight_m_run_anim_f', 4, 10)
    loop('orc-run', 'orc_warrior_run_anim_f', 4, 8)
    loop('imp-idle', 'imp_idle_anim_f', 4, 8)
    loop('demon-idle', 'big_demon_idle_anim_f', 4, 6)
    loop('demon-run', 'big_demon_run_anim_f', 2, 8)
  }

  private paintRoom(id: RoomId, tiles: readonly string[]): void {
    if (id === 'roof') {
      this.track(this.add.image(0, 0, 'bg-roof').setOrigin(0, 0).setDepth(-2))
      return
    }
    const wall = this.add.renderTexture(0, 0, VIEW_W, VIEW_H).setOrigin(0, 0).setDepth(-2)
    this.track(wall)
    const stamp = this.add.image(0, 0, 'wall_mid').setOrigin(0, 0).setVisible(false)
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 20; x++) {
        stamp.setTexture(x % 6 === 0 ? 'wall_left' : 'wall_mid')
        stamp.setPosition(x * 16, y * 16)
        wall.draw(stamp)
      }
    }
    stamp.destroy()
    const floor = tiles[11] ?? ''
    for (let col = 1; col < 19; col++) {
      if (floor[col] === '.') this.track(this.add.image(col * 16, 11 * 16, 'hole').setOrigin(0, 0).setDepth(0))
    }
    this.decorate(id)
  }

  private decorate(id: RoomId): void {
    const hang = (key: string, x: number, y: number) => {
      this.track(this.add.image(x, y, key).setOrigin(0, 0).setDepth(0))
    }
    const stand = (key: string, x: number, y: number) => {
      this.track(this.add.image(x, y, key).setOrigin(0.5, 1).setDepth(0))
    }
    if (id === 'gate' || id === 'hall' || id === 'throne') {
      hang('wall_banner_red', 36, 28)
      hang('wall_banner_blue', 250, 28)
    }
    if (id === 'chapel') hang('wall_banner_blue', 80, 28)
    if (id === 'court') hang('wall_banner_red', 40, 24)
    if (id === 'library') {
      stand('crate', 140, FLOOR_Y)
      stand('crate', 156, FLOOR_Y)
    }
    if (id === 'crypt') {
      stand('skull', 120, FLOOR_Y)
      stand('crate', 230, FLOOR_Y)
    }
    if (id === 'clock') stand('column', 250, FLOOR_Y)
    if (id === 'throne') stand('doors_leaf_closed', 250, FLOOR_Y)
    if (id === 'gate') stand('column', 40, FLOOR_Y)
  }

  private track<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.local.push(obj)
    return obj
  }

  private spawnCandle(x: number, y: number, save: boolean): void {
    const image = this.add.image(x, y, save ? 'flask_big_red' : 'flask_red').setOrigin(0.5, 1).setDepth(3)
    this.track(image)
    if (!save) {
      this.candles.push(image)
      return
    }
    this.physics.add.existing(image, true)
    const body = image.body as Phaser.Physics.Arcade.StaticBody
    body.setSize(18, 28)
    this.physics.add.overlap(this.player, image, () => {
      if (this.checkpoint === this.roomId) return
      this.checkpoint = this.roomId
      this.say('烛火记住了你。', 1400)
      this.sfx.ding()
      this.persist()
    })
  }

  private spawnPickup(pickup: Pickup): void {
    const icon = this.add.image(pickup.x, pickup.y, RELIC_KEY[pickup.relic]).setOrigin(0.5, 1).setDepth(4)
    this.track(icon)
    this.physics.add.existing(icon, true)
    this.physics.add.overlap(this.player, icon, () => {
      if (this.relics.has(pickup.relic)) return
      this.relics.add(pickup.relic)
      this.say(pickup.text, 2400)
      this.sfx.pickup()
      icon.destroy()
      this.persist()
    })
  }

  private spawnFoe(spawn: FoeSpawn): void {
    const key = spawn.kind === 'bat' ? 'imp_idle_anim_f0' : 'orc_warrior_idle_anim_f0'
    const sprite = this.physics.add.sprite(spawn.x, spawn.y - 1, key).setOrigin(0.5, 1).setDepth(6)
    this.track(sprite)
    const body = sprite.body as Phaser.Physics.Arcade.Body
    const tall = spawn.kind === 'bat' ? 10 : 16
    body.setSize(12, tall)
    body.setOffset((sprite.frame.width - 12) / 2, sprite.frame.height - tall)
    if (spawn.kind === 'bat') body.setAllowGravity(false)
    else this.physics.add.collider(sprite, this.solids)
    this.foes.push({
      sprite,
      hp: spawn.hp,
      dir: 1,
      left: spawn.left,
      right: spawn.right,
      hurt: 0,
      xp: spawn.xp,
      baseY: spawn.y,
      kind: spawn.kind,
    })
  }

  private spawnBoss(): void {
    const sprite = this.physics.add.sprite(236, FLOOR_Y, 'big_demon_idle_anim_f0').setOrigin(0.5, 1).setDepth(6)
    this.track(sprite)
    const body = sprite.body as Phaser.Physics.Arcade.Body
    body.setSize(20, 22)
    body.setOffset((sprite.frame.width - 20) / 2, sprite.frame.height - 22)
    this.physics.add.collider(sprite, this.solids)
    this.bossSprite = sprite
    this.bossState = createBoss()
  }

  private damageFoe(foe: Foe, amount: number): void {
    if (foe.hurt > 0 || !foe.sprite.active) return
    foe.hp -= amount
    foe.hurt = 260
    foe.sprite.setVelocityX(this.player.x < foe.sprite.x ? 80 : -80)
    this.sfx.hit()
    if (foe.hp > 0) return
    foe.sprite.destroy()
    const before = levelFor(this.xp)
    this.gainXp(foe.xp)
    this.hearts = Math.min(HEART_MAX, this.hearts + 1)
    if (levelFor(this.xp) === before) this.say(`+${foe.xp}`, 700)
  }

  private damageBoss(amount: number): void {
    if (!this.bossState || this.bossState.dead) return
    const before = this.bossState.hp
    const hit = hurtBoss(this.bossState, amount)
    this.bossState = hit.state
    if (hit.state.hp === before) return
    this.sfx.hit()
    if (!hit.killed) return
    this.bossDead = true
    this.bossSprite?.setVelocity(0, 0)
    const body = this.bossSprite?.body as Phaser.Physics.Arcade.Body | undefined
    if (body) body.enable = false
    this.gainXp(40)
    this.say('王座空了。露台开了。', 2600)
    this.sfx.ding()
    this.layoutLabels()
    this.persist()
  }

  private gainXp(amount: number): void {
    const before = levelFor(this.xp)
    this.xp += amount
    const after = levelFor(this.xp)
    if (after > before) {
      this.hp = maxHp(after)
      this.say(`升到 ${after} 级。剑更沉了。`, 2000)
      this.sfx.ding()
    }
    this.persist()
  }

  private breakCandle(candle: Phaser.GameObjects.Image): void {
    candle.destroy()
    this.candles = this.candles.filter((item) => item !== candle)
    this.hearts = Math.min(HEART_MAX, this.hearts + 3)
    this.say('心 +3', 800)
    this.sfx.pickup()
    this.persist()
  }

  private hurt(fromX = this.player.x): void {
    if (this.time.now < this.invulnUntil || this.time.now < this.dashUntil) return
    this.hp -= 1
    this.invulnUntil = this.time.now + PHYS.invulnMs
    this.sfx.hurt()
    this.cameras.main.flash(70, 140, 20, 30, false)
    if (this.hp <= 0) {
      this.hp = maxHp(levelFor(this.xp))
      this.say('烛火把你拉了回来。', 2000)
      const room = ROOMS[this.checkpoint]
      const spot = room.candles.find((candle) => candle.save) ?? room.entry
      this.enter(this.checkpoint, spot.x, spot.y, null)
      return
    }
    const dir = this.player.x < fromX ? -1 : 1
    this.player.setVelocity(dir * 140, -180)
  }

  private removeDagger(dagger: Phaser.Physics.Arcade.Sprite): void {
    dagger.destroy()
    this.daggers = this.daggers.filter((item) => item !== dagger)
  }

  private playerBox(): Rect {
    return { x: this.player.x - 6, y: this.player.y - 16, w: 12, h: 16 }
  }

  private bounds(obj: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image): Rect {
    const rect = obj.getBounds()
    return { x: rect.x, y: rect.y, w: rect.width, h: rect.height }
  }

  private say(text: string, ms = 1600): void {
    this.captionText = text
    this.captionUntil = this.time.now + ms
  }

  private layoutLabels(): void {
    const root = document.querySelector('.doors')
    const stage = document.querySelector('#stage')
    if (!(root instanceof HTMLElement) || !(stage instanceof HTMLElement)) return
    const canvas = this.game.canvas.getBoundingClientRect()
    const host = stage.getBoundingClientRect()
    if (canvas.width < 2) return
    this.labelWidth = canvas.width
    const scale = canvas.width / VIEW_W
    root.replaceChildren()
    root.style.fontSize = `${Math.max(16, Math.round(scale * 7))}px`
    for (const passage of ROOMS[this.roomId].passages) {
      if (passage.need === 'boss' && !this.bossDead) continue
      const label = document.createElement('span')
      label.className = 'door-label'
      label.textContent = passage.label
      const at = this.labelPoint(passage.dir, passage.min, passage.max)
      label.style.left = `${canvas.left - host.left + at.x * scale}px`
      label.style.top = `${canvas.top - host.top + at.y * scale}px`
      root.append(label)
    }
  }

  private labelPoint(dir: Dir, min: number, max: number): { x: number; y: number } {
    if (dir === 'left') return { x: 28, y: 150 }
    if (dir === 'right') return { x: VIEW_W - 28, y: 150 }
    if (dir === 'up') return { x: (min + max) / 2, y: 46 }
    return { x: (min + max) / 2, y: 150 }
  }

  private persist(): void {
    const save: SaveData = {
      relics: [...this.relics],
      checkpoint: this.checkpoint,
      bossDead: this.bossDead,
      visited: [...this.visited],
      xp: this.xp,
      hearts: this.hearts,
    }
    writeSave(localStorage, save)
  }
}
