import { ROOMS, type Relic, type RoomId } from './rooms'

const MAP: Record<RoomId, { x: number; y: number }> = {
  clock: { x: 18, y: 12 },
  chapel: { x: 8, y: 34 },
  hall: { x: 32, y: 34 },
  library: { x: 56, y: 34 },
  court: { x: 32, y: 58 },
  crypt: { x: 58, y: 58 },
  throne: { x: 78, y: 58 },
  roof: { x: 92, y: 40 },
  gate: { x: 18, y: 82 },
}

const RELIC_LABEL: Record<Relic, string> = {
  boots: '靴',
  cloak: '斗篷',
  badge: '城徽',
}

const QUESTS: { relic: Relic; where: string }[] = [
  { relic: 'boots', where: '礼拜堂' },
  { relic: 'cloak', where: '书库' },
  { relic: 'badge', where: '钟楼' },
]

export interface HudState {
  hp: number
  maxHp: number
  level: number
  xp: number
  xpNext: number
  hearts: number
  relics: Relic[]
  line: string
  mapOpen: boolean
  roomId: RoomId
  visited: RoomId[]
  bossDead: boolean
  ended: boolean
  started: boolean
}

export interface Hud {
  update(state: HudState): void
}

export function createHud(root: HTMLElement): Hud {
  root.innerHTML = `
    <div class="bar">
      <div class="hp"></div>
      <div class="room"></div>
      <div class="meta"></div>
      <div class="items"></div>
    </div>
    <p class="line"></p>
    <div class="doors"></div>
    <div class="veil title">
      <p class="kicker">黄昏</p>
      <h2>夜巡</h2>
      <p>城在黄昏醒来。</p>
      <p class="press">按 Z 入城</p>
    </div>
    <div class="veil map">
      <p class="kicker">夜城</p>
      <div class="map-board"></div>
      <div class="quests"></div>
      <p class="press">再按 M 关上</p>
    </div>
    <div class="veil ending">
      <p class="kicker">露台</p>
      <h2>夜过去了</h2>
      <p>城门在你身后合上。</p>
    </div>
  `
  const hp = root.querySelector('.hp') as HTMLElement
  const room = root.querySelector('.room') as HTMLElement
  const meta = root.querySelector('.meta') as HTMLElement
  const items = root.querySelector('.items') as HTMLElement
  const line = root.querySelector('.line') as HTMLElement
  const title = root.querySelector('.title') as HTMLElement
  const map = root.querySelector('.map') as HTMLElement
  const ending = root.querySelector('.ending') as HTMLElement
  const board = root.querySelector('.map-board') as HTMLElement
  const quests = root.querySelector('.quests') as HTMLElement
  let last = ''

  return {
    update(state) {
      const key = JSON.stringify(state)
      if (key === last) return
      last = key
      hp.innerHTML = Array.from({ length: state.maxHp }, (_, i) => `<i class="${i < state.hp ? 'on' : ''}"></i>`).join('')
      room.textContent = ROOMS[state.roomId].name
      meta.textContent = `Lv.${state.level}  ${state.xp}/${state.xpNext}  ♥${state.hearts}`
      items.innerHTML = (Object.keys(RELIC_LABEL) as Relic[])
        .map((relic) => `<span class="${state.relics.includes(relic) ? 'own' : ''}">${RELIC_LABEL[relic]}</span>`)
        .join('')
      line.textContent = state.line
      title.hidden = state.started
      map.hidden = !state.mapOpen
      ending.hidden = !state.ended
      board.innerHTML = (Object.keys(MAP) as RoomId[])
        .filter((id) => state.visited.includes(id))
        .map((id) => {
          const spot = MAP[id]
          const here = id === state.roomId ? ' here' : ''
          return `<div class="map-room${here}" style="left:${spot.x}%;top:${spot.y}%">${ROOMS[id].name}</div>`
        })
        .join('')
      const seals = QUESTS.map((quest) => `${quest.where} · ${RELIC_LABEL[quest.relic]}${state.relics.includes(quest.relic) ? ' 已取' : ''}`).join('　')
      quests.textContent = `${seals}　王座 · ${state.bossDead ? '已开' : '未开'}`
    },
  }
}
