export const TILE = 16
export const COLS = 20
export const ROWS = 12
export const VIEW_W = COLS * TILE
export const VIEW_H = ROWS * TILE
export const FLOOR_Y = (ROWS - 1) * TILE

export type Relic = 'boots' | 'cloak' | 'badge'
export type Need = Relic | 'boss'
export type Dir = 'left' | 'right' | 'up' | 'down'

export type RoomId =
  | 'gate'
  | 'court'
  | 'hall'
  | 'chapel'
  | 'library'
  | 'clock'
  | 'crypt'
  | 'throne'
  | 'roof'

export interface Passage {
  dir: Dir
  to: RoomId
  min: number
  max: number
  need?: Need
  label: string
}

export interface Pickup {
  relic: Relic
  x: number
  y: number
  text: string
}

export interface FoeSpawn {
  kind: 'skeleton' | 'bat'
  x: number
  y: number
  left: number
  right: number
  hp: number
  xp: number
}

export interface Room {
  id: RoomId
  name: string
  bg: number
  tiles: string[]
  entry: { x: number; y: number }
  passages: Passage[]
  pickups: Pickup[]
  foes: FoeSpawn[]
  candles: { x: number; y: number; save?: boolean }[]
  boss: boolean
  ending: boolean
}

const FLOOR_DOOR = { min: 140, max: 200 }

function grid(): string[][] {
  const cells = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => '.'))
  for (let x = 0; x < COLS; x++) {
    cells[0][x] = '#'
    cells[ROWS - 1][x] = '#'
  }
  for (let y = 0; y < ROWS; y++) {
    cells[y][0] = '#'
    cells[y][COLS - 1] = '#'
  }
  return cells
}

function fill(cells: string[][], x: number, y: number, w: number, h: number, ch = '#'): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) cells[yy][xx] = ch
  }
}

function carve(cells: string[][], x: number, y: number, w: number, h: number): void {
  fill(cells, x, y, w, h, '.')
}

function bake(cells: string[][]): string[] {
  return cells.map((row) => row.join(''))
}

function sideDoor(cells: string[][], col: number): void {
  carve(cells, col, 9, 1, 2)
}

function gateTiles(): string[] {
  const cells = grid()
  fill(cells, 8, 8, 5, 1)
  fill(cells, 5, 5, 5, 1)
  fill(cells, 2, 2, 5, 1)
  carve(cells, 2, 0, 5, 1)
  return bake(cells)
}

function courtTiles(): string[] {
  const cells = grid()
  carve(cells, 2, 11, 3, 1)
  carve(cells, 13, 11, 5, 1)
  fill(cells, 8, 8, 4, 1)
  fill(cells, 4, 5, 4, 1)
  fill(cells, 8, 2, 4, 1)
  carve(cells, 9, 0, 3, 1)
  sideDoor(cells, COLS - 1)
  return bake(cells)
}

function hallTiles(): string[] {
  const cells = grid()
  carve(cells, 9, 11, 3, 1)
  sideDoor(cells, 0)
  sideDoor(cells, COLS - 1)
  fill(cells, 2, 8, 5, 1)
  carve(cells, 2, 0, 5, 1)
  return bake(cells)
}

function clockTiles(): string[] {
  const cells = grid()
  carve(cells, 2, 11, 3, 1)
  return bake(cells)
}

function sideRoom(open: 'left' | 'right'): string[] {
  const cells = grid()
  sideDoor(cells, open === 'left' ? 0 : COLS - 1)
  return bake(cells)
}

function chainRoom(left: boolean, right: boolean): string[] {
  const cells = grid()
  if (left) sideDoor(cells, 0)
  if (right) sideDoor(cells, COLS - 1)
  return bake(cells)
}

const BOOTS: Pickup = { relic: 'boots', x: 150, y: FLOOR_Y, text: '夜靴。可以在空中再跳一次。' }
const CLOAK: Pickup = { relic: 'cloak', x: 210, y: FLOOR_Y, text: '斗篷。按住 Shift 冲刺。' }
const BADGE: Pickup = { relic: 'badge', x: 180, y: FLOOR_Y, text: '城徽。王座会认它。' }

export const ROOMS: Record<RoomId, Room> = {
  gate: {
    id: 'gate',
    name: '城门',
    bg: 0x14101c,
    tiles: gateTiles(),
    entry: { x: 240, y: FLOOR_Y },
    passages: [{ dir: 'up', to: 'court', min: 32, max: 112, label: '中庭' }],
    pickups: [],
    foes: [],
    candles: [{ x: 270, y: FLOOR_Y, save: true }],
    boss: false,
    ending: false,
  },
  court: {
    id: 'court',
    name: '中庭',
    bg: 0x161422,
    tiles: courtTiles(),
    entry: { x: 200, y: FLOOR_Y },
    passages: [
      { dir: 'down', to: 'gate', min: 32, max: 80, label: '城门' },
      { dir: 'up', to: 'hall', min: 144, max: 192, label: '大厅' },
      { dir: 'right', to: 'crypt', ...FLOOR_DOOR, need: 'cloak', label: '地穴' },
    ],
    pickups: [],
    foes: [{ kind: 'bat', x: 60, y: 70, left: 40, right: 120, hp: 3, xp: 8 }],
    candles: [{ x: 200, y: FLOOR_Y, save: true }],
    boss: false,
    ending: false,
  },
  hall: {
    id: 'hall',
    name: '大厅',
    bg: 0x181420,
    tiles: hallTiles(),
    entry: { x: 250, y: FLOOR_Y },
    passages: [
      { dir: 'down', to: 'court', min: 144, max: 192, label: '中庭' },
      { dir: 'left', to: 'chapel', ...FLOOR_DOOR, label: '礼拜堂' },
      { dir: 'right', to: 'library', ...FLOOR_DOOR, label: '书库' },
      { dir: 'up', to: 'clock', min: 32, max: 112, need: 'boots', label: '钟楼' },
    ],
    pickups: [],
    foes: [{ kind: 'skeleton', x: 250, y: FLOOR_Y, left: 220, right: 300, hp: 4, xp: 12 }],
    candles: [{ x: 250, y: FLOOR_Y }],
    boss: false,
    ending: false,
  },
  chapel: {
    id: 'chapel',
    name: '礼拜堂',
    bg: 0x1a1424,
    tiles: sideRoom('right'),
    entry: { x: 80, y: FLOOR_Y },
    passages: [{ dir: 'right', to: 'hall', ...FLOOR_DOOR, label: '大厅' }],
    pickups: [BOOTS],
    foes: [{ kind: 'skeleton', x: 230, y: FLOOR_Y, left: 180, right: 290, hp: 4, xp: 12 }],
    candles: [{ x: 70, y: FLOOR_Y }],
    boss: false,
    ending: false,
  },
  library: {
    id: 'library',
    name: '书库',
    bg: 0x16120e,
    tiles: sideRoom('left'),
    entry: { x: 90, y: FLOOR_Y },
    passages: [{ dir: 'left', to: 'hall', ...FLOOR_DOOR, label: '大厅' }],
    pickups: [CLOAK],
    foes: [{ kind: 'bat', x: 160, y: 120, left: 80, right: 240, hp: 3, xp: 8 }],
    candles: [{ x: 80, y: FLOOR_Y }],
    boss: false,
    ending: false,
  },
  clock: {
    id: 'clock',
    name: '钟楼',
    bg: 0x12141c,
    tiles: clockTiles(),
    entry: { x: 150, y: FLOOR_Y },
    passages: [{ dir: 'down', to: 'hall', min: 32, max: 80, label: '大厅' }],
    pickups: [BADGE],
    foes: [{ kind: 'bat', x: 220, y: 110, left: 140, right: 280, hp: 3, xp: 8 }],
    candles: [{ x: 150, y: FLOOR_Y, save: true }],
    boss: false,
    ending: false,
  },
  crypt: {
    id: 'crypt',
    name: '地穴',
    bg: 0x120e14,
    tiles: chainRoom(true, true),
    entry: { x: 80, y: FLOOR_Y },
    passages: [
      { dir: 'left', to: 'court', ...FLOOR_DOOR, label: '中庭' },
      { dir: 'right', to: 'throne', ...FLOOR_DOOR, need: 'badge', label: '王座' },
    ],
    pickups: [],
    foes: [{ kind: 'skeleton', x: 180, y: FLOOR_Y, left: 120, right: 260, hp: 5, xp: 14 }],
    candles: [{ x: 70, y: FLOOR_Y, save: true }],
    boss: false,
    ending: false,
  },
  throne: {
    id: 'throne',
    name: '王座',
    bg: 0x1a1014,
    tiles: chainRoom(true, true),
    entry: { x: 70, y: FLOOR_Y },
    passages: [
      { dir: 'left', to: 'crypt', ...FLOOR_DOOR, label: '地穴' },
      { dir: 'right', to: 'roof', ...FLOOR_DOOR, need: 'boss', label: '露台' },
    ],
    pickups: [],
    foes: [],
    candles: [],
    boss: true,
    ending: false,
  },
  roof: {
    id: 'roof',
    name: '露台',
    bg: 0x10141e,
    tiles: sideRoom('left'),
    entry: { x: 80, y: FLOOR_Y },
    passages: [{ dir: 'left', to: 'throne', ...FLOOR_DOOR, label: '王座' }],
    pickups: [],
    foes: [],
    candles: [],
    boss: false,
    ending: true,
  },
}

export function opposite(dir: Dir): Dir {
  if (dir === 'left') return 'right'
  if (dir === 'right') return 'left'
  if (dir === 'up') return 'down'
  return 'up'
}

export function isSafeStand(tiles: readonly string[], x: number, feetY: number): boolean {
  const col = Math.floor(x / TILE)
  const row = Math.floor(feetY / TILE)
  if (col <= 0 || col >= COLS - 1 || row <= 0 || row >= ROWS) return false
  return tiles[row]?.[col] === '#' && tiles[row - 1]?.[col] === '.'
}

export function columnHasFloor(tiles: readonly string[], x: number, fromY: number): boolean {
  const col = Math.floor(x / TILE)
  if (col <= 0 || col >= COLS - 1) return false
  const row = Math.max(0, Math.floor(fromY / TILE))
  for (let y = row; y < ROWS; y++) if (tiles[y]?.[col] === '#') return true
  return false
}

export function surfaceTops(tiles: readonly string[]): number[] {
  const found = new Set<number>()
  for (let y = 1; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (tiles[y]?.[x] === '#' && tiles[y - 1]?.[x] === '.') found.add(y * TILE)
    }
  }
  return [...found].sort((a, b) => a - b)
}

export function widestFloorHole(tiles: readonly string[]): number {
  let best = 0
  let run = 0
  for (const cell of tiles[ROWS - 1] ?? '') {
    if (cell === '.') {
      run += 1
      best = Math.max(best, run)
    } else run = 0
  }
  return best * TILE
}

export function tryLeave(
  room: Room,
  x: number,
  feetY: number,
  relics: ReadonlySet<Relic>,
  bossDead: boolean,
): Passage | null {
  for (const passage of room.passages) {
    if (!passageOpens(passage, relics, bossDead)) continue
    if (passage.dir === 'left' && x < 12 && feetY >= passage.min && feetY <= passage.max) return passage
    if (passage.dir === 'right' && x > VIEW_W - 12 && feetY >= passage.min && feetY <= passage.max) return passage
    if (passage.dir === 'up' && feetY < 18 && x >= passage.min && x <= passage.max) return passage
    if (passage.dir === 'down' && feetY > FLOOR_Y + 24 && x >= passage.min && x <= passage.max) return passage
  }
  return null
}

export function passageOpens(passage: Passage, relics: ReadonlySet<Relic>, bossDead: boolean): boolean {
  if (!passage.need) return true
  if (passage.need === 'boss') return bossDead
  return relics.has(passage.need)
}

export function land(room: Room, via: Dir, x: number): { x: number; y: number } {
  if (via === 'left') return { x: 28, y: FLOOR_Y }
  if (via === 'right') return { x: VIEW_W - 28, y: FLOOR_Y }
  if (via === 'down') {
    const shaft = room.passages.find((passage) => passage.dir === 'down')
    return { x: (shaft?.max ?? x) + 18, y: FLOOR_Y }
  }
  return { x: Math.min(VIEW_W - 28, Math.max(28, x)), y: 32 }
}

export function isRoomId(value: unknown): value is RoomId {
  return typeof value === 'string' && value in ROOMS
}

export function isRelic(value: unknown): value is Relic {
  return value === 'boots' || value === 'cloak' || value === 'badge'
}
