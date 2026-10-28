import type { TickContext } from "../context";
import { makeEvent, type SimEvent } from "../events";
import { forgetVillager } from "../relations";
import type { Rng } from "../rng";
import type { Kin, Order, OrderKind, Realm, Villager, World } from "../types";
import { recordDeath } from "./population";

/** Named people the chronicle follows. Everyone past this is part of a household's crowd. */
export const CAST_LIMIT = 50;

const ORDER_HEADS = 10;
const ORDER_ADULTS = 4;
const REALM_HEADS = 16;
const REALM_WAIT = 200;
const BATTLE_CHANCE = 0.01;
const WAR_GAP = 80;
const ARMS_TO_FIGHT = 8;

const ERAS = ["禾初", "开石", "承泉", "霜纪", "桑始", "岭正"] as const;

const ORDER_NAME: Record<OrderKind, (region: string, house: string) => string> = {
  clan: (_region, house) => `${house}氏`,
  craft: (region) => `${region}匠坊`,
  hunt: (region) => `${region}猎团`,
  shrine: (region) => `${region}祠`,
};

function houseOf(name: string): string {
  return name.slice(0, 1) || "民";
}

function heads(world: World, regionId: string): number {
  return world.villagers.filter((v) => v.regionId === regionId).length + (world.folk[regionId] ?? 0);
}

function regionName(world: World, regionId: string): string {
  return world.regions.find((r) => r.id === regionId)?.name ?? "未知之地";
}

function living(world: World, id: string | null): Villager | undefined {
  if (!id) return undefined;
  return world.villagers.find((v) => v.id === id);
}

/**
 * The cast is full. Someone marginal steps into the unnamed crowd so the
 * newcomer — a child, or a stranger — can keep a name.
 */
export function seatNewcomer(world: World, newcomer: Villager): SimEvent[] {
  if (world.villagers.length <= CAST_LIMIT) return [];
  const protectedIds = new Set<string>([newcomer.id, ...newcomer.parents]);
  const displaced = pickExpendable(world, protectedIds);
  if (!displaced) return [];

  const kin: Kin = {
    id: displaced.id,
    name: displaced.name,
    sex: displaced.sex,
    parents: [...displaced.parents],
    bornTick: displaced.bornTick,
    regionId: displaced.regionId,
  };
  world.kin.push(kin);
  world.folk[displaced.regionId] = (world.folk[displaced.regionId] ?? 0) + 1;
  if (displaced.partnerId) {
    const partner = living(world, displaced.partnerId);
    if (partner) partner.partnerId = null;
  }
  world.villagers = world.villagers.filter((v) => v.id !== displaced.id);
  forgetVillager(world.villagers, displaced.id);
  releaseFromGroups(world, displaced.id);

  return [
    makeEvent(world.tick, "notable", {
      type: "recede",
      name: displaced.name,
      id: displaced.id,
      childName: newcomer.name,
      region: regionName(world, kin.regionId),
      regionId: kin.regionId,
    }),
  ];
}

function pickExpendable(world: World, protectedIds: ReadonlySet<string>): Villager | null {
  const ranked = world.villagers
    .map((person) => ({ person, score: expendableScore(world, person, protectedIds) }))
    .filter((row): row is { person: Villager; score: number } => row.score !== null)
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.person ?? null;
}

function expendableScore(
  world: World,
  person: Villager,
  protectedIds: ReadonlySet<string>,
): number | null {
  if (protectedIds.has(person.id)) return null;
  if (person.pregnancy !== null) return null;
  if (person.age < 16) return null;
  if (world.realms.some((realm) => realm.rulerId === person.id || realm.heirId === person.id)) {
    return null;
  }
  let score = person.age;
  const children = world.villagers.filter((v) => v.parents.includes(person.id));
  if (children.some((child) => child.age < 16)) score -= 80;
  if (children.length === 0) score += 30;
  if (person.partnerId) score -= 12;
  if (world.orders.some((order) => order.leaderId === person.id)) score -= 40;
  return score;
}

function releaseFromGroups(world: World, id: string): void {
  for (const faction of world.factions) {
    faction.memberIds = faction.memberIds.filter((member) => member !== id);
    if (faction.leaderId === id) faction.leaderId = faction.memberIds[0] ?? id;
  }
  for (const order of world.orders) {
    if (order.leaderId === id) {
      const next = world.villagers.find((v) => v.regionId === order.regionId && v.age >= 16);
      if (next) order.leaderId = next.id;
    }
  }
}

export function stepPolity(world: World, ctx: TickContext, rng: Rng): SimEvent[] {
  const events: SimEvent[] = [];
  events.push(...tendFolk(world, rng));
  if (world.tick > 0 && world.tick % 30 === 0) {
    events.push(...foundOrders(world));
    events.push(...foundRealms(world, rng));
    events.push(...considerSecession(world));
  }
  events.push(...forgeArms(world));
  events.push(...settleThrones(world));
  if (rng.chance(BATTLE_CHANCE)) events.push(...resolveClash(world, ctx, rng));
  events.push(...settleThrones(world));
  return events;
}

function tendFolk(world: World, rng: Rng): SimEvent[] {
  const events: SimEvent[] = [];
  for (const region of world.regions) {
    const named = world.villagers.filter((v) => v.regionId === region.id);
    if (named.length === 0) {
      world.folk[region.id] = 0;
      continue;
    }
    let folk = world.folk[region.id] ?? 0;
    region.food = Math.max(0, region.food - folk * 0.08);
    const afterEat = named.length + folk;
    if (folk > 0 && region.food / Math.max(1, afterEat) < 1.5) {
      folk -= 1;
      world.folk[region.id] = folk;
      if (world.tick % 90 === 0) {
        events.push(
          makeEvent(world.tick, "notable", {
            type: "attrition",
            region: region.name,
            regionId: region.id,
          }),
        );
      }
      continue;
    }
    const room = named.length * 4;
    if (
      named.length >= 4 &&
      folk < room &&
      region.fertility > 20 &&
      region.food / Math.max(1, afterEat) > 3.2 &&
      rng.chance(0.028)
    ) {
      world.folk[region.id] = folk + 1;
    }
  }
  return events;
}

function foundOrders(world: World): SimEvent[] {
  const events: SimEvent[] = [];
  for (const region of world.regions) {
    if (world.orders.some((order) => order.regionId === region.id)) continue;
    const adults = world.villagers.filter((v) => v.regionId === region.id && v.age >= 16);
    if (adults.length < ORDER_ADULTS || heads(world, region.id) < ORDER_HEADS) continue;
    const leader = adults.slice().sort((a, b) => standing(world, b) - standing(world, a))[0];
    if (!leader) continue;
    const kind = orderKind(region.shrine, leader);
    const order: Order = {
      id: `o${world.nextId++}`,
      name: ORDER_NAME[kind](region.name, houseOf(leader.name)),
      kind,
      regionId: region.id,
      leaderId: leader.id,
      formedTick: world.tick,
    };
    world.orders.push(order);
    events.push(
      makeEvent(world.tick, "major", {
        type: "order",
        name: order.name,
        kind,
        leaderName: leader.name,
        region: region.name,
        regionId: region.id,
      }),
    );
  }
  return events;
}

function standing(world: World, person: Villager): number {
  const skill = Math.max(...Object.values(person.skills));
  const children = world.villagers.filter((v) => v.parents.includes(person.id)).length;
  return skill + children * 12 + person.age / 10;
}

function orderKind(shrine: boolean, leader: Villager): OrderKind {
  if (shrine && (leader.traits.includes("devout") || leader.skills.healing >= leader.skills.farming)) {
    return "shrine";
  }
  const best = (Object.entries(leader.skills) as Array<[keyof Villager["skills"], number]>).sort(
    (a, b) => b[1] - a[1],
  )[0]?.[0];
  if (best === "crafting") return "craft";
  if (best === "hunting") return "hunt";
  return "clan";
}

function foundRealms(world: World, rng: Rng): SimEvent[] {
  const events: SimEvent[] = [];
  for (const order of world.orders) {
    if (world.realms.some((realm) => realm.regionIds.includes(order.regionId))) continue;
    const age = world.tick - order.formedTick;
    const crowd = heads(world, order.regionId);
    if (crowd < REALM_HEADS) continue;
    if (age < REALM_WAIT && crowd < 28) continue;
    const ruler = living(world, order.leaderId);
    if (!ruler) continue;
    const house = houseOf(ruler.name);
    const realm: Realm = {
      id: `k${world.nextId++}`,
      name: realmTitle(world, house, regionName(world, order.regionId)),
      era: rng.pick(ERAS),
      house,
      rulerId: ruler.id,
      heirId: heirOf(world, [order.regionId], ruler.id)?.id ?? null,
      regionIds: [order.regionId],
      arms: 0,
      formedTick: world.tick,
      lastWarTick: world.tick,
    };
    world.realms.push(realm);
    world.folk[order.regionId] = Math.max(world.folk[order.regionId] ?? 0, 16);
    events.push(
      makeEvent(world.tick, "major", {
        type: "realm",
        name: realm.name,
        era: realm.era,
        rulerName: ruler.name,
        region: regionName(world, order.regionId),
        regionId: order.regionId,
      }),
    );
  }
  return events;
}

function heirOf(world: World, regionIds: readonly string[], predecessorId: string): Villager | undefined {
  const children = world.villagers
    .filter((v) => v.parents.includes(predecessorId))
    .sort((a, b) => b.age - a.age);
  if (children[0]) return children[0];
  return world.villagers
    .filter((v) => regionIds.includes(v.regionId) && v.age >= 16 && v.id !== predecessorId)
    .sort((a, b) => b.age - a.age)[0];
}

/**
 * A faction that will not follow the ruling house walks out and plants its own
 * flag, which is how a second dynasty appears before the map is full of states.
 */
function considerSecession(world: World): SimEvent[] {
  if (world.realms.length !== 1) return [];
  const realm = world.realms[0];
  if (world.tick - realm.formedTick < 400) return [];
  const faction = world.factions.find(
    (group) =>
      realm.regionIds.includes(group.regionId) &&
      group.leaderId !== realm.rulerId &&
      group.memberIds.length >= 2,
  );
  if (!faction) return [];
  const from = world.regions.find((r) => r.id === faction.regionId);
  const destId = from?.neighbors.find((id) => !realm.regionIds.includes(id));
  const leader = living(world, faction.leaderId);
  if (!from || !destId || !leader) return [];

  const moved: Villager[] = [];
  for (const id of faction.memberIds) {
    const person = living(world, id);
    if (!person || person.id === realm.rulerId) continue;
    person.regionId = destId;
    person.movedTick = world.tick;
    moved.push(person);
  }
  if (moved.length < 2) return [];

  const share = Math.max(4, Math.floor((world.folk[from.id] ?? 0) / 3));
  const taken = Math.min(world.folk[from.id] ?? 0, share);
  world.folk[from.id] = (world.folk[from.id] ?? 0) - taken;
  world.folk[destId] = (world.folk[destId] ?? 0) + taken;

  const house = houseOf(leader.name);
  const rival: Realm = {
    id: `k${world.nextId++}`,
    name: realmTitle(world, house, regionName(world, destId)),
    era: ERAS[(world.realms.length + realm.era.length) % ERAS.length],
    house,
    rulerId: leader.id,
    heirId: heirOf(world, [destId], leader.id)?.id ?? null,
    regionIds: [destId],
    arms: Math.floor(realm.arms / 3),
    formedTick: world.tick,
    lastWarTick: world.tick,
  };
  realm.arms -= rival.arms;
  realm.lastWarTick = world.tick;
  world.realms.push(rival);
  if (!world.orders.some((order) => order.regionId === destId)) {
    world.orders.push({
      id: `o${world.nextId++}`,
      name: `${house}氏`,
      kind: "clan",
      regionId: destId,
      leaderId: leader.id,
      formedTick: world.tick,
    });
  }

  return [
    makeEvent(world.tick, "major", {
      type: "secession",
      name: rival.name,
      from: realm.name,
      rulerName: leader.name,
      region: regionName(world, destId),
      regionId: destId,
      names: moved.map((person) => person.name),
    }),
  ];
}

function realmTitle(world: World, house: string, place: string): string {
  const base = `${house}朝`;
  if (!world.realms.some((realm) => realm.name === base)) return base;
  const local = `${place}${house}氏`;
  if (!world.realms.some((realm) => realm.name === local)) return local;
  return `${base}${world.realms.length + 1}`;
}

function forgeArms(world: World): SimEvent[] {
  const events: SimEvent[] = [];
  for (const realm of world.realms) {
    const region = world.regions
      .filter((candidate) => realm.regionIds.includes(candidate.id))
      .sort((a, b) => b.stone - a.stone)[0];
    if (!region) continue;
    const smith = world.villagers.some(
      (v) => realm.regionIds.includes(v.regionId) && v.skills.crafting >= 28,
    );
    const crowd = realm.regionIds.reduce((sum, id) => sum + (world.folk[id] ?? 0), 0);
    if (!smith && crowd < 4) continue;
    if (region.stone >= 0.5) region.stone = Math.max(0, region.stone - 0.12);
    const before = realm.arms;
    realm.arms = Math.min(48, realm.arms + (smith ? 0.45 : 0.28));
    if (before < ARMS_TO_FIGHT && realm.arms >= ARMS_TO_FIGHT) {
      events.push(
        makeEvent(world.tick, "notable", {
          type: "arms",
          realm: realm.name,
          region: region.name,
          regionId: region.id,
        }),
      );
    }
  }
  return events;
}

function settleThrones(world: World): SimEvent[] {
  const events: SimEvent[] = [];
  const fallen: Realm[] = [];
  for (const realm of world.realms) {
    const ruler = living(world, realm.rulerId);
    if (ruler) {
      if (!living(world, realm.heirId)) realm.heirId = heirOf(world, realm.regionIds, ruler.id)?.id ?? null;
      continue;
    }
    const predecessor =
      world.kin.find((k) => k.id === realm.rulerId)?.name ??
      world.graves.find((g) => g.id === realm.rulerId)?.name ??
      "先君";
    const next = heirOf(world, realm.regionIds, realm.rulerId);
    if (!next) {
      fallen.push(realm);
      events.push(
        makeEvent(world.tick, "major", {
          type: "realmEnd",
          name: realm.name,
          region: regionName(world, realm.regionIds[0] ?? ""),
          regionId: realm.regionIds[0] ?? "",
        }),
      );
      continue;
    }
    realm.rulerId = next.id;
    realm.heirId = heirOf(world, realm.regionIds, next.id)?.id ?? null;
    const order = world.orders.find((item) => item.regionId === next.regionId);
    if (order) order.leaderId = next.id;
    events.push(
      makeEvent(world.tick, "major", {
        type: "succession",
        realm: realm.name,
        predecessor,
        successor: next.name,
        region: regionName(world, next.regionId),
        regionId: next.regionId,
      }),
    );
  }
  if (fallen.length > 0) {
    const gone = new Set(fallen.map((realm) => realm.id));
    world.realms = world.realms.filter((realm) => !gone.has(realm.id));
  }
  return events;
}

type Front = { left: Realm; right: Realm; regionId: string };

function findFront(world: World): Front | null {
  for (let i = 0; i < world.realms.length; i += 1) {
    for (let j = i + 1; j < world.realms.length; j += 1) {
      const left = world.realms[i];
      const right = world.realms[j];
      for (const regionId of left.regionIds) {
        const region = world.regions.find((r) => r.id === regionId);
        const border = region?.neighbors.find((id) => right.regionIds.includes(id));
        if (border) return { left, right, regionId: border };
      }
    }
  }
  return null;
}

/** One clash, if two armed houses share a border. Exported so a test can force it. */
export function resolveClash(world: World, _ctx: TickContext, rng: Rng): SimEvent[] {
  const front = findFront(world);
  if (!front) return [];
  const { left, right } = front;
  if (left.arms < ARMS_TO_FIGHT || right.arms < ARMS_TO_FIGHT) return [];
  if (world.tick - left.lastWarTick < WAR_GAP || world.tick - right.lastWarTick < WAR_GAP) return [];

  left.arms = Math.max(0, left.arms - rng.range(3, 6));
  right.arms = Math.max(0, right.arms - rng.range(3, 6));
  left.lastWarTick = world.tick;
  right.lastWarTick = world.tick;

  levy(world, left, rng);
  levy(world, right, rng);
  const fallen = [...fellInBattle(world, left, rng), ...fellInBattle(world, right, rng)];
  const winner = left.arms + rng.range(0, 5) >= right.arms ? left : right;
  const loser = winner === left ? right : left;
  const seized = loser.regionIds.find((id) => id === front.regionId && loser.regionIds.length > 1);
  if (seized) {
    loser.regionIds = loser.regionIds.filter((id) => id !== seized);
    winner.regionIds.push(seized);
  }

  const events: SimEvent[] = [
    makeEvent(world.tick, "major", {
      type: "battle",
      attacker: left.name,
      defender: right.name,
      region: regionName(world, front.regionId),
      regionId: front.regionId,
      winner: winner.name,
      fallen: fallen.map((person) => person.name),
    }),
  ];
  for (const person of fallen) {
    events.push(recordDeath(world, person, "battle", regionName(world, person.regionId)));
  }
  return events;
}

function levy(world: World, realm: Realm, rng: Rng): void {
  const regionId = realm.regionIds[0];
  if (!regionId) return;
  const folk = world.folk[regionId] ?? 0;
  if (folk <= 0) return;
  world.folk[regionId] = Math.max(0, folk - Math.round(rng.range(1, 4)));
}

function fellInBattle(world: World, realm: Realm, rng: Rng): Villager[] {
  if (!rng.chance(0.22)) return [];
  const pool = world.villagers.filter(
    (v) => realm.regionIds.includes(v.regionId) && v.age >= 16 && v.id !== realm.rulerId,
  );
  const victim = pool.length > 0 ? rng.pick(pool) : rng.chance(0.15) ? living(world, realm.rulerId) : undefined;
  return victim ? [victim] : [];
}
