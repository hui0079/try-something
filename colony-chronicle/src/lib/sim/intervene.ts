import { addEffect } from "./effects";
import { makeEvent, type InterventionKind, type SimEvent } from "./events";
import { clamp } from "./math";
import { makeName, takenNames } from "./names";
import { adjustRelation } from "./relations";
import { Rng } from "./rng";
import { ALL_TRAITS } from "./traits";
import type { Region, SkillKey, Villager, World } from "./types";
import { seatNewcomer } from "./systems/polity";
import { cloneWorld, ensureState } from "./world";

export type InterventionDef = {
  kind: InterventionKind;
  label: string;
  /** What it does, in the player's terms. */
  description: string;
  cost: number;
  /** How many regions the player must pick. */
  targets: 0 | 1 | 2;
};

export const INTERVENTIONS: readonly InterventionDef[] = [
  { kind: "rain", label: "降雨", description: "三天连雨，水位上涨，田里也好过些", cost: 6, targets: 0 },
  { kind: "drought", label: "干旱", description: "八天无云，水一天天见底", cost: 6, targets: 0 },
  { kind: "coldSnap", label: "寒潮", description: "三天严寒，没有屋子的人最先撑不住", cost: 8, targets: 0 },
  { kind: "warmSpell", label: "暖阳", description: "四天晴好，庄稼长得快", cost: 6, targets: 0 },
  { kind: "releaseDeer", label: "放生鹿群", description: "往一处山野放入猎物", cost: 10, targets: 1 },
  { kind: "seedForest", label: "播撒林种", description: "让一处长出更多树木", cost: 8, targets: 1 },
  { kind: "digCanal", label: "开掘水渠", description: "让两地共用水源", cost: 18, targets: 2 },
  { kind: "openRoad", label: "开辟道路", description: "让两地之间可以迁徙", cost: 14, targets: 2 },
  { kind: "manna", label: "天降粮食", description: "往一处粮仓里添一批口粮", cost: 12, targets: 1 },
  { kind: "stranger", label: "异乡来客", description: "一个带着手艺的陌生人找上门", cost: 15, targets: 0 },
  { kind: "plague", label: "降下瘟疫", description: "一处染上恶疾，持续六天", cost: 10, targets: 1 },
  { kind: "revelation", label: "神启", description: "信仰大涨，人心安定数日", cost: 10, targets: 0 },
];

export const INTERVENTION_BY_KIND = new Map(INTERVENTIONS.map((def) => [def.kind, def]));

export type InterventionResult = {
  world: World;
  events: SimEvent[];
  ok: boolean;
  error?: string;
};

const SKILL_KEYS: readonly SkillKey[] = ["farming", "hunting", "crafting", "healing"];

function reject(world: World, error: string): InterventionResult {
  return { world, events: [], ok: false, error };
}

function findRegions(world: World, ids: readonly string[]): Region[] | null {
  const found: Region[] = [];
  for (const id of ids) {
    const region = world.regions.find((r) => r.id === id);
    if (!region) return null;
    found.push(region);
  }
  return found;
}

/**
 * Applies one act of the player's will. Influence is the only brake: without a
 * price, a player just holds down "rain" forever.
 */
export function applyIntervention(
  previous: World,
  kind: InterventionKind,
  regionIds: readonly string[] = [],
): InterventionResult {
  const def = INTERVENTION_BY_KIND.get(kind);
  if (!def) return reject(previous, "没有这种干预");
  if (previous.influence < def.cost) return reject(previous, "影响力不够");
  if (regionIds.length !== def.targets) return reject(previous, "选择的地点数量不对");

  const world = ensureState(cloneWorld(previous));
  const targets = findRegions(world, regionIds);
  if (!targets) return reject(previous, "找不到指定的地点");
  const rng = new Rng(world.rngState);
  const events: SimEvent[] = [];

  switch (kind) {
    case "rain":
      addEffect(world, { kind: "rain", daysLeft: 3, magnitude: 1, regionIds: [] });
      break;
    case "drought":
      addEffect(world, { kind: "drought", daysLeft: 8, magnitude: 1, regionIds: [] });
      break;
    case "coldSnap":
      addEffect(world, { kind: "cold", daysLeft: 3, magnitude: 1, regionIds: [] });
      break;
    case "warmSpell":
      addEffect(world, { kind: "warm", daysLeft: 4, magnitude: 1, regionIds: [] });
      for (const region of world.regions) {
        region.fertility = clamp(region.fertility + 4, 0, 100);
      }
      break;
    case "releaseDeer":
      targets[0].game = clamp(targets[0].game + 35, 0, targets[0].gameCap);
      break;
    case "seedForest":
      targets[0].wood = clamp(targets[0].wood + 30, 0, targets[0].woodCap);
      targets[0].fertility = clamp(targets[0].fertility + 3, 0, 100);
      break;
    case "manna":
      targets[0].food += 25;
      break;
    case "plague":
      addEffect(world, {
        kind: "plague",
        daysLeft: 6,
        magnitude: 1,
        regionIds: [targets[0].id],
      });
      events.push(
        makeEvent(world.tick, "major", {
          type: "plague",
          region: targets[0].name,
          regionId: targets[0].id,
          names: world.villagers.filter((v) => v.regionId === targets[0].id).map((v) => v.name),
        }),
      );
      break;
    case "revelation":
      world.faith = clamp(world.faith + 18, 0, 100);
      addEffect(world, { kind: "blessing", daysLeft: 5, magnitude: 1, regionIds: [] });
      break;

    case "digCanal": {
      const [a, b] = targets;
      if (a.id === b.id) return reject(previous, "水渠要连接两个不同的地方");
      if (a.channels.includes(b.id)) return reject(previous, "这两地之间已经有水渠了");
      a.channels.push(b.id);
      b.channels.push(a.id);
      break;
    }
    case "openRoad": {
      const [a, b] = targets;
      if (a.id === b.id) return reject(previous, "道路要连接两个不同的地方");
      if (a.neighbors.includes(b.id)) return reject(previous, "这两地之间已经有路了");
      a.neighbors.push(b.id);
      b.neighbors.push(a.id);
      break;
    }

    case "stranger": {
      const home = strangerDestination(world);
      if (!home) return reject(previous, "没有能落脚的地方");
      const taken = takenNames(world.villagers, world.graves, world.kin);
      const stranger = makeStranger(world, home.id, rng, taken);
      world.villagers.push(stranger);
      events.push(...seatNewcomer(world, stranger));
      world.yearTally.arrivals += 1;
      events.push(
        makeEvent(world.tick, "major", {
          type: "arrival",
          name: stranger.name,
          id: stranger.id,
          region: home.name,
          regionId: home.id,
        }),
      );
      break;
    }
  }

  world.influence -= def.cost;
  world.rngState = rng.state;
  events.push(
    makeEvent(world.tick, "notable", {
      type: "intervention",
      kind,
      regions: targets.map((r) => r.name),
      regionIds: targets.map((r) => r.id),
    }),
  );

  return { world, events, ok: true };
}

/** Prefers wherever people already live; otherwise the most liveable spot. */
function strangerDestination(world: World): Region | null {
  const counts = new Map<string, number>();
  for (const v of world.villagers) counts.set(v.regionId, (counts.get(v.regionId) ?? 0) + 1);
  let best: Region | null = null;
  let bestScore = -Infinity;
  for (const region of world.regions) {
    const populated = counts.get(region.id) ?? 0;
    const score = populated > 0 ? 1000 + populated : region.water + region.fertility;
    if (score > bestScore) {
      bestScore = score;
      best = region;
    }
  }
  return best;
}

function makeStranger(
  world: World,
  regionId: string,
  rng: Rng,
  taken: ReadonlySet<string>,
): Villager {
  const specialty = rng.pick(SKILL_KEYS);
  const skills = {} as Record<SkillKey, number>;
  for (const key of SKILL_KEYS) {
    skills[key] = Math.round(key === specialty ? rng.range(55, 85) : rng.range(5, 30));
  }
  const stranger: Villager = {
    id: `v${world.nextId++}`,
    name: makeName(rng, taken),
    age: rng.intBetween(18, 40),
    sex: rng.chance(0.5) ? "f" : "m",
    regionId,
    satiety: 55,
    hydration: 60,
    health: 80,
    mood: 60,
    skills,
    traits: [rng.pick(ALL_TRAITS)],
    relations: {},
    parents: [],
    partnerId: null,
    pregnancy: null,
    lastAction: null,
    bornTick: world.tick - rng.intBetween(18, 40) * 120,
    movedTick: world.tick,
    harmCause: null,
  };
  for (const other of world.villagers) {
    if (other.regionId === regionId) adjustRelation(stranger, other, 10);
  }
  return stranger;
}
