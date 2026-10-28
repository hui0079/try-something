import { ROOMS, passageOpens, type Relic, type RoomId } from './rooms'

export function canReach(target: RoomId, relics: ReadonlySet<Relic>, bossDead = false): boolean {
  const seen = new Set<RoomId>()
  const queue: RoomId[] = ['gate']
  while (queue.length > 0) {
    const id = queue.pop()
    if (!id || seen.has(id)) continue
    seen.add(id)
    if (id === target) return true
    for (const passage of ROOMS[id].passages) {
      if (passageOpens(passage, relics, bossDead) && !seen.has(passage.to)) queue.push(passage.to)
    }
  }
  return false
}

export function canObtain(relic: Relic, owned: ReadonlySet<Relic>): boolean {
  const room = Object.values(ROOMS).find((item) => item.pickups.some((pickup) => pickup.relic === relic))
  if (!room) return false
  return canReach(room.id, owned)
}
