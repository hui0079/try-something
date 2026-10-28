import { DAYS_PER_YEAR } from "./calendar";
import { makeEvent, type SimEvent } from "./events";
import { clamp } from "./math";
import { makeName } from "./names";
import { Rng, seedToState } from "./rng";
import { ALL_TRAITS } from "./traits";
import type { Region, SkillKey, Trait, Villager, World } from "./types";

export const WORLD_VERSION = 3;
export const FOUNDER_COUNT = 6;

/** 1 food unit = 1 person-day of rations = 25 satiety. */
export const FOOD_TO_SATIETY = 25;

type RegionTemplate = Omit<Region, "neighbors" | "channels"> & {
  neighbors: string[];
  channels: string[];
  /** Whether founders may start here. */
  habitable: boolean;
};

const REGION_TEMPLATES: readonly RegionTemplate[] = [
  {
    id: "riverbend",
    name: "河湾",
    terrain: "大河拐弯处的淤积平地，水丰土肥",
    food: 0,
    water: 95,
    waterCap: 100,
    waterRecharge: 6.5,
    wood: 40,
    woodCap: 60,
    stone: 10,
    stoneRichness: 0.15,
    salt: 0,
    game: 45,
    gameCap: 70,
    fertility: 82,
    shelter: 30,
    hasSalt: false,
    shrine: false,
    neighbors: ["southSlope", "oakwood", "holySpring"],
    channels: [],
    habitable: true,
  },
  {
    id: "southSlope",
    name: "南坡",
    terrain: "向阳的缓坡，日照长，水要自己挑",
    food: 0,
    water: 55,
    waterCap: 70,
    waterRecharge: 1.3,
    wood: 25,
    woodCap: 40,
    stone: 20,
    stoneRichness: 0.25,
    salt: 0,
    game: 30,
    gameCap: 50,
    fertility: 90,
    shelter: 15,
    hasSalt: false,
    shrine: false,
    neighbors: ["riverbend", "stoneRidge"],
    channels: [],
    habitable: true,
  },
  {
    id: "oakwood",
    name: "橡树林",
    terrain: "老橡树连成的林子，木头和野兽都不缺",
    food: 0,
    water: 60,
    waterCap: 80,
    waterRecharge: 2.5,
    wood: 95,
    woodCap: 110,
    stone: 5,
    stoneRichness: 0.05,
    salt: 0,
    game: 80,
    gameCap: 100,
    fertility: 55,
    shelter: 10,
    hasSalt: false,
    shrine: false,
    neighbors: ["riverbend", "northWaste"],
    channels: [],
    habitable: false,
  },
  {
    id: "stoneRidge",
    name: "石岗",
    terrain: "裸露的岩脊，凿石容易，种地难",
    food: 0,
    water: 25,
    waterCap: 45,
    waterRecharge: 0.8,
    wood: 15,
    woodCap: 30,
    stone: 90,
    stoneRichness: 1,
    salt: 0,
    game: 25,
    gameCap: 40,
    fertility: 30,
    shelter: 20,
    hasSalt: false,
    shrine: false,
    neighbors: ["southSlope", "saltMarsh"],
    channels: [],
    habitable: false,
  },
  {
    id: "saltMarsh",
    name: "盐沼",
    terrain: "泛白的湿洼地，能刮到盐，但庄稼不活",
    food: 0,
    water: 70,
    waterCap: 90,
    waterRecharge: 3.2,
    wood: 10,
    woodCap: 25,
    stone: 5,
    stoneRichness: 0.05,
    salt: 60,
    game: 35,
    gameCap: 55,
    fertility: 20,
    shelter: 5,
    hasSalt: true,
    shrine: false,
    neighbors: ["stoneRidge"],
    channels: [],
    habitable: false,
  },
  {
    id: "northWaste",
    name: "北荒",
    terrain: "风口上的砾石旱地，只有野兽愿意待",
    food: 0,
    water: 20,
    waterCap: 40,
    waterRecharge: 0.5,
    wood: 8,
    woodCap: 20,
    stone: 35,
    stoneRichness: 0.5,
    salt: 0,
    game: 55,
    gameCap: 80,
    fertility: 18,
    shelter: 0,
    hasSalt: false,
    shrine: false,
    neighbors: ["oakwood"],
    channels: [],
    habitable: false,
  },
  {
    id: "holySpring",
    name: "圣泉",
    terrain: "岩缝里涌出的泉眼，先来的人在这里立了石龛",
    food: 0,
    water: 88,
    waterCap: 95,
    waterRecharge: 5,
    wood: 30,
    woodCap: 45,
    stone: 15,
    stoneRichness: 0.2,
    salt: 0,
    game: 20,
    gameCap: 35,
    fertility: 60,
    shelter: 12,
    hasSalt: false,
    shrine: true,
    neighbors: ["riverbend"],
    channels: [],
    habitable: true,
  },
];

export const REGION_IDS = REGION_TEMPLATES.map((r) => r.id);

function jitter(rng: Rng, value: number, spread: number, max: number): number {
  if (value === 0) return 0;
  return clamp(Math.round(value * rng.range(1 - spread, 1 + spread)), 0, max);
}

function buildRegions(rng: Rng): Region[] {
  return REGION_TEMPLATES.map((template) => ({
    id: template.id,
    name: template.name,
    terrain: template.terrain,
    food: 0,
    water: jitter(rng, template.water, 0.12, template.waterCap),
    waterCap: template.waterCap,
    waterRecharge: template.waterRecharge,
    wood: jitter(rng, template.wood, 0.18, template.woodCap),
    woodCap: template.woodCap,
    stone: jitter(rng, template.stone, 0.2, 999),
    stoneRichness: template.stoneRichness,
    salt: jitter(rng, template.salt, 0.2, 999),
    game: jitter(rng, template.game, 0.18, template.gameCap),
    gameCap: template.gameCap,
    fertility: jitter(rng, template.fertility, 0.12, 100),
    shelter: jitter(rng, template.shelter, 0.25, 100),
    hasSalt: template.hasSalt,
    shrine: template.shrine,
    neighbors: [...template.neighbors],
    channels: [],
  }));
}

const SKILL_KEYS: readonly SkillKey[] = ["farming", "hunting", "crafting", "healing"];

function makeFounder(
  rng: Rng,
  id: string,
  regionId: string,
  sex: "m" | "f",
  age: number,
  taken: Set<string>,
): Villager {
  const specialty = rng.pick(SKILL_KEYS);
  const skills = {} as Record<SkillKey, number>;
  for (const key of SKILL_KEYS) {
    skills[key] = Math.round(key === specialty ? rng.range(45, 75) : rng.range(5, 30));
  }
  const traitCount = rng.chance(0.35) ? 2 : 1;
  const traits: Trait[] = [];
  for (let i = 0; i < traitCount; i += 1) {
    const trait = rng.pick(ALL_TRAITS);
    if (!traits.includes(trait)) traits.push(trait);
  }
  const name = makeName(rng, taken);
  taken.add(name);
  return {
    id,
    name,
    age,
    sex,
    regionId,
    satiety: Math.round(rng.range(60, 85)),
    hydration: Math.round(rng.range(65, 90)),
    health: Math.round(rng.range(75, 95)),
    mood: Math.round(rng.range(55, 75)),
    skills,
    traits,
    relations: {},
    parents: [],
    partnerId: null,
    pregnancy: null,
    lastAction: null,
    // Negative: they were born somewhere else, before there was a village.
    bornTick: -age * DAYS_PER_YEAR,
    movedTick: 0,
    harmCause: null,
  };
}

export function createWorld(seed: string): { world: World; events: SimEvent[] } {
  const rng = new Rng(seedToState(seed));
  const regions = buildRegions(rng);
  const habitable = REGION_TEMPLATES.filter((t) => t.habitable).map((t) => t.id);
  const homeId = rng.pick(habitable);
  const home = regions.find((r) => r.id === homeId)!;

  const taken = new Set<string>();
  const villagers: Villager[] = [];
  for (let i = 0; i < FOUNDER_COUNT; i += 1) {
    // Three young women, so the first generation can actually fill out before
    // it ages out of childbearing. One elder, so there is someone to bury.
    const sex: "m" | "f" = i < 3 ? "f" : "m";
    const age =
      i === FOUNDER_COUNT - 1
        ? rng.intBetween(52, 62)
        : i < 3
          ? rng.intBetween(18, 28)
          : rng.intBetween(20, 34);
    villagers.push(makeFounder(rng, `v${i + 1}`, homeId, sex, age, taken));
  }
  for (const a of villagers) {
    for (const b of villagers) {
      if (a.id === b.id) continue;
      a.relations[b.id] = Math.round(rng.range(18, 45));
    }
  }

  home.food = Math.round(FOUNDER_COUNT * rng.range(8, 12));
  // They did not arrive yesterday: there are huts standing.
  home.shelter = Math.max(home.shelter, 35);

  const world: World = {
    version: WORLD_VERSION,
    seed,
    rngState: rng.state,
    tick: 0,
    regions,
    villagers,
    graves: [],
    weather: "clear",
    weatherDays: 3,
    faith: 20,
    influence: 20,
    saltStore: 0,
    effects: [],
    alarms: [],
    factions: [],
    folk: Object.fromEntries(regions.map((region) => [region.id, 0])),
    kin: [],
    orders: [],
    realms: [],
    history: [],
    nextId: FOUNDER_COUNT + 1,
    yearTally: { births: 0, deaths: 0, departures: 0, arrivals: 0 },
  };

  const events = [
    makeEvent(0, "major", {
      type: "founding",
      names: villagers.map((v) => v.name),
      region: home.name,
    }),
  ];
  return { world, events };
}

export function populationOf(world: World, regionId: string): number {
  let count = 0;
  for (const v of world.villagers) if (v.regionId === regionId) count += 1;
  return count;
}

/** Unnamed crowd in one place. Old saves have no `folk` until the next day runs. */
export function folkOf(world: World, regionId: string): number {
  return world.folk?.[regionId] ?? 0;
}

export function headsOf(world: World, regionId: string): number {
  return populationOf(world, regionId) + folkOf(world, regionId);
}

/**
 * Fills in the polity fields. Saves written before organizations existed are
 * still the same version; they simply never stored a crowd, a house, or an army.
 */
export function ensureState(world: World): World {
  world.folk ??= {};
  world.kin ??= [];
  world.orders ??= [];
  world.realms ??= [];
  for (const region of world.regions) world.folk[region.id] ??= 0;
  for (const realm of world.realms) {
    realm.arms ??= 0;
    realm.lastWarTick ??= 0;
    realm.regionIds ??= [];
    realm.heirId ??= null;
  }
  for (const grave of world.graves) grave.parents ??= [];
  return world;
}

/** structuredClone keeps the tick pure without hand-writing immutable updates. */
export function cloneWorld(world: World): World {
  if (typeof structuredClone === "function") return structuredClone(world);
  return JSON.parse(JSON.stringify(world)) as World;
}
