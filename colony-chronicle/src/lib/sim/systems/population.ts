import { calendarOf, DAYS_PER_YEAR, SEASON_LABEL } from "../calendar";
import type { TickContext } from "../context";
import { WORKING_AGE } from "../decide";
import { makeEvent, type SimEvent } from "../events";
import { clamp } from "../math";
import { makeName, takenNames } from "../names";
import { adjustRelation, forgetVillager, relationBetween } from "../relations";
import { seatNewcomer } from "./polity";
import type { Rng } from "../rng";
import { ALL_TRAITS } from "../traits";
import type { DeathCause, Grave, SkillKey, Villager, World } from "../types";
import type { ActionOutcome } from "./actions";

export const PREGNANCY_DAYS = 45;
const FERTILE_MIN = 16;
const FERTILE_MAX = 45;
/**
 * A nursing mother does not conceive again. Without this the settlement fills
 * with infants who eat but cannot work, and starves inside a decade for reasons
 * that have nothing to do with the land.
 */
const NURSING_DAYS = 300;
const SKILL_KEYS: readonly SkillKey[] = ["farming", "hunting", "crafting", "healing"];

const CAUSE_LABEL: Record<DeathCause, string> = {
  starvation: "饿死",
  thirst: "渴死",
  cold: "冻死",
  plague: "病死",
  beast: "死于野兽",
  age: "寿终",
  frailty: "体衰而亡",
  battle: "阵亡",
};

function epitaphFor(villager: Villager, tick: number, cause: DeathCause | null): string {
  const now = calendarOf(tick);
  const born =
    villager.bornTick < 0
      ? "生于立村之前"
      : (() => {
          const cal = calendarOf(villager.bornTick);
          return `生于第 ${cal.year} 年${SEASON_LABEL[cal.season]}`;
        })();
  const end =
    cause === null
      ? `第 ${now.year} 年${SEASON_LABEL[now.season]}离开了聚落`
      : `第 ${now.year} 年${SEASON_LABEL[now.season]}${CAUSE_LABEL[cause]}`;
  return `${born}，${end}，年 ${villager.age}。`;
}

function populationByRegion(world: World): Map<string, number> {
  const counts = new Map<string, number>();
  for (const v of world.villagers) counts.set(v.regionId, (counts.get(v.regionId) ?? 0) + 1);
  return counts;
}

export function stepPopulation(
  world: World,
  ctx: TickContext,
  rng: Rng,
  outcomes: Map<string, ActionOutcome>,
): SimEvent[] {
  const events: SimEvent[] = [];
  const hadPeople = world.villagers.length > 0;

  if (world.tick > 0 && world.tick % DAYS_PER_YEAR === 0) {
    for (const villager of world.villagers) {
      villager.age += 1;
      if (villager.age !== 16) continue;
      const region = ctx.regions.get(villager.regionId)?.region;
      events.push(
        makeEvent(world.tick, "notable", {
          type: "comingOfAge",
          name: villager.name,
          id: villager.id,
          region: region?.name ?? "未知之地",
          regionId: villager.regionId,
        }),
      );
    }
  }

  events.push(...resolveDepartures(world, ctx, outcomes));
  events.push(...resolveDeaths(world, ctx, rng));
  events.push(...resolveBirths(world, ctx, rng));
  followParents(world);

  if (hadPeople && world.villagers.length === 0) {
    const last = world.graves[world.graves.length - 1];
    events.push(
      makeEvent(world.tick, "major", { type: "collapse", region: last?.regionName ?? "无人之地" }),
    );
  }
  return events;
}

/** Grief ripples out to everyone who cared about the person. */
function mourn(world: World, gone: Villager): void {
  for (const other of world.villagers) {
    if (other.id === gone.id) continue;
    const regard = relationBetween(other, gone);
    if (regard <= 20) continue;
    other.mood = clamp(other.mood - regard / 3, 0, 100);
  }
  if (gone.partnerId) {
    const partner = world.villagers.find((v) => v.id === gone.partnerId);
    if (partner) {
      partner.partnerId = null;
      partner.mood = clamp(partner.mood - 12, 0, 100);
    }
  }
}

export function recordDeath(
  world: World,
  villager: Villager,
  cause: DeathCause,
  regionName: string,
): SimEvent {
  const regionId = villager.regionId;
  remove(world, villager, {
    id: villager.id,
    name: villager.name,
    age: villager.age,
    kind: "death",
    cause,
    regionId,
    regionName,
    tick: world.tick,
    bornTick: villager.bornTick,
    epitaph: epitaphFor(villager, world.tick, cause),
    parents: [...villager.parents],
  });
  world.yearTally.deaths += 1;
  return makeEvent(world.tick, "major", {
    type: "death",
    name: villager.name,
    id: villager.id,
    age: villager.age,
    cause,
    region: regionName,
    regionId,
  });
}

function remove(world: World, villager: Villager, grave: Grave): void {
  mourn(world, villager);
  world.villagers = world.villagers.filter((v) => v.id !== villager.id);
  forgetVillager(world.villagers, villager.id);
  world.graves.push(grave);
}

function resolveDepartures(
  world: World,
  ctx: TickContext,
  outcomes: Map<string, ActionOutcome>,
): SimEvent[] {
  const events: SimEvent[] = [];
  const leaving = world.villagers.filter((v) => outcomes.get(v.id)?.kind === "leave");
  for (const villager of leaving) {
    const region = ctx.regions.get(villager.regionId)?.region;
    remove(world, villager, {
      id: villager.id,
      name: villager.name,
      age: villager.age,
      kind: "departure",
      cause: null,
      regionId: villager.regionId,
      regionName: region?.name ?? "未知之地",
      tick: world.tick,
      bornTick: villager.bornTick,
      epitaph: epitaphFor(villager, world.tick, null),
      parents: [...villager.parents],
    });
    world.yearTally.departures += 1;
    events.push(
      makeEvent(world.tick, "major", {
        type: "departure",
        name: villager.name,
        id: villager.id,
        region: region?.name ?? "未知之地",
        regionId: villager.regionId,
      }),
    );
  }
  return events;
}

function resolveDeaths(world: World, ctx: TickContext, rng: Rng): SimEvent[] {
  const events: SimEvent[] = [];
  const doomed: Array<{ villager: Villager; cause: DeathCause }> = [];

  for (const villager of world.villagers) {
    if (villager.health <= 0) {
      doomed.push({ villager, cause: villager.harmCause ?? "frailty" });
      continue;
    }
    // Old age has to actually arrive. The previous curve left a founder of 60
    // with a few percent chance a year, so a village could go two decades
    // with a single funeral.
    if (villager.age > 52) {
      const p = Math.pow(villager.age - 52, 2) * 0.00008;
      if (rng.chance(p)) doomed.push({ villager, cause: "age" });
    }
  }

  for (const { villager, cause } of doomed) {
    const region = ctx.regions.get(villager.regionId)?.region;
    events.push(recordDeath(world, villager, cause, region?.name ?? "未知之地"));
  }
  return events;
}

/** A mother is `parents[0]`, so her most recent child can always be found. */
function lastBirthByMother(world: World): Map<string, number> {
  const latest = new Map<string, number>();
  for (const child of [...world.villagers, ...world.graves, ...world.kin]) {
    const motherId = "parents" in child ? child.parents[0] : undefined;
    if (!motherId) continue;
    latest.set(motherId, Math.max(latest.get(motherId) ?? -Infinity, child.bornTick));
  }
  return latest;
}

function resolveBirths(world: World, ctx: TickContext, rng: Rng): SimEvent[] {
  const events: SimEvent[] = [];
  const counts = populationByRegion(world);
  const lastBirth = lastBirthByMother(world);
  const taken = takenNames(world.villagers, world.graves, world.kin);

  for (const mother of world.villagers) {
    if (mother.pregnancy !== null) {
      mother.pregnancy += 1;
      if (mother.pregnancy < PREGNANCY_DAYS) continue;
      mother.pregnancy = null;
      const baby = makeBaby(world, mother, rng, taken);
      taken.add(baby.name);
      world.villagers.push(baby);
      events.push(...seatNewcomer(world, baby));
      world.yearTally.births += 1;
      const region = ctx.regions.get(mother.regionId)?.region;
      events.push(
        makeEvent(world.tick, "major", {
          type: "birth",
          name: baby.name,
          id: baby.id,
          motherName: mother.name,
          region: region?.name ?? "未知之地",
          regionId: mother.regionId,
        }),
      );
      continue;
    }

    if (mother.sex !== "f") continue;
    if (mother.age < FERTILE_MIN || mother.age > FERTILE_MAX) continue;
    const previous = lastBirth.get(mother.id);
    if (previous !== undefined && world.tick - previous < NURSING_DAYS) continue;
    if (!mother.partnerId) continue;
    const partner = world.villagers.find((v) => v.id === mother.partnerId);
    if (!partner || partner.regionId !== mother.regionId) continue;
    if (mother.satiety <= 55 || mother.health <= 50) continue;
    const region = ctx.regions.get(mother.regionId)?.region;
    if (!region) continue;
    // A family only takes the risk when there is food to spare and the land can
    // still produce. Without the second condition the colony keeps breeding
    // right through the collapse of its own fields.
    const perHead =
      region.food / Math.max(1, (counts.get(mother.regionId) ?? 0) + (world.folk[mother.regionId] ?? 0));
    // Comfortable, not overflowing. A granary of a few days' food per person
    // used to veto every pregnancy, which is how a village stayed at a dozen
    // people for twenty years.
    if (perHead <= 2.5 || region.fertility < 20) continue;
    if (rng.chance(0.07)) mother.pregnancy = 0;
  }
  return events;
}

function makeBaby(
  world: World,
  mother: Villager,
  rng: Rng,
  taken: ReadonlySet<string>,
): Villager {
  const skills = {} as Record<SkillKey, number>;
  for (const key of SKILL_KEYS) skills[key] = Math.round(rng.range(2, 8));
  const baby: Villager = {
    id: `v${world.nextId++}`,
    name: makeName(rng, taken),
    age: 0,
    sex: rng.chance(0.5) ? "f" : "m",
    regionId: mother.regionId,
    satiety: 70,
    hydration: 70,
    health: 85,
    mood: 65,
    skills,
    traits: [rng.pick(ALL_TRAITS)],
    relations: {},
    parents: mother.partnerId ? [mother.id, mother.partnerId] : [mother.id],
    partnerId: null,
    pregnancy: null,
    lastAction: null,
    bornTick: world.tick,
    movedTick: world.tick,
    harmCause: null,
  };
  for (const other of world.villagers) {
    if (other.regionId !== baby.regionId) continue;
    // Parents start above the bond threshold rather than crossing it, because a
    // parent loving their newborn is not news the chronicle should report.
    adjustRelation(baby, other, baby.parents.includes(other.id) ? 78 : 15);
  }
  return baby;
}

/** Small children go wherever their mother went. */
function followParents(world: World): void {
  const byId = new Map(world.villagers.map((v) => [v.id, v]));
  for (const child of world.villagers) {
    if (child.age >= WORKING_AGE || child.parents.length === 0) continue;
    const guardian = child.parents.map((id) => byId.get(id)).find((v) => v !== undefined);
    if (guardian && guardian.regionId !== child.regionId) child.regionId = guardian.regionId;
  }
}
