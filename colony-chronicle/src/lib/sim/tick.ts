import { buildContext, type TickContext } from "./context";
import { chooseAction } from "./decide";
import { ageEffects } from "./effects";
import { makeEvent, type SimEvent } from "./events";
import { clamp } from "./math";
import { SKILL_LABEL } from "./names";
import { Rng } from "./rng";
import { executeAction, type ActionOutcome } from "./systems/actions";
import { stepHazards } from "./systems/hazards";
import { stepMetabolism } from "./systems/metabolism";
import { stepPolity } from "./systems/polity";
import { stepPopulation } from "./systems/population";
import { regenerateResources, settleResources } from "./systems/resources";
import { stepSocial } from "./systems/social";
import { stepWeather } from "./systems/weather";
import type { StatPoint, Villager, World } from "./types";
import { cloneWorld, ensureState } from "./world";

export const INFLUENCE_PER_DAY = 2;
export const INFLUENCE_CAP = 60;
const HISTORY_LIMIT = 4000;

export type TickResult = { world: World; events: SimEvent[] };

/**
 * Advances the world by one day. Pure from the caller's side: the input world is
 * never touched, and the same input always produces the same output because all
 * randomness comes from `world.rngState`.
 */
export function tick(previous: World): TickResult {
  const world = ensureState(cloneWorld(previous));
  const rng = new Rng(world.rngState);
  const events: SimEvent[] = [];

  const ctx = buildContext(world);

  if (world.tick > 0 && ctx.calendar.dayOfSeason === 1) {
    events.push(
      makeEvent(world.tick, "notable", {
        type: "season",
        season: ctx.calendar.season,
        year: ctx.calendar.year,
      }),
    );
  }

  events.push(...stepWeather(world, ctx, rng));
  events.push(...stepHazards(world, ctx, rng));
  regenerateResources(world, ctx);

  const outcomes = new Map<string, ActionOutcome>();
  // Shuffle so the first villager in the array is not always first to the
  // granary; deterministic because the shuffle uses the world's own rng.
  for (const villager of rng.shuffled(world.villagers)) {
    const choice = chooseAction(villager, world, ctx, rng);
    outcomes.set(villager.id, executeAction(world, villager, choice, ctx, rng));
  }
  events.push(...summariseActions(world, ctx, outcomes));

  events.push(...stepMetabolism(world, ctx, outcomes));
  events.push(...stepSocial(world, ctx, rng));
  events.push(...stepPopulation(world, ctx, rng, outcomes));
  events.push(...stepPolity(world, ctx, rng));
  events.push(...settleResources(world, ctx));

  ageEffects(world);
  world.influence = clamp(world.influence + INFLUENCE_PER_DAY, 0, INFLUENCE_CAP);
  world.faith = clamp(world.faith - 0.08, 0, 100);

  if (ctx.calendar.isYearEnd) {
    events.push(
      makeEvent(world.tick, "major", {
        type: "yearSummary",
        year: ctx.calendar.year,
        population:
          world.villagers.length + Object.values(world.folk).reduce((sum, count) => sum + count, 0),
        births: world.yearTally.births,
        deaths: world.yearTally.deaths,
        departures: world.yearTally.departures,
        arrivals: world.yearTally.arrivals,
        food: Math.round(world.regions.reduce((sum, r) => sum + r.food, 0)),
      }),
    );
    world.yearTally = { births: 0, deaths: 0, departures: 0, arrivals: 0 };
  }

  world.tick += 1;
  world.history.push(statPoint(world));
  if (world.history.length > HISTORY_LIMIT) {
    world.history = world.history.slice(world.history.length - HISTORY_LIMIT);
  }
  world.rngState = rng.state;

  return { world, events };
}

export function advance(world: World, days: number): TickResult {
  let current = world;
  const events: SimEvent[] = [];
  for (let i = 0; i < days; i += 1) {
    const result = tick(current);
    current = result.world;
    events.push(...result.events);
  }
  return { world: current, events };
}

function statPoint(world: World): StatPoint {
  const people = world.villagers;
  const mean = (pick: (v: Villager) => number) =>
    people.length === 0 ? 0 : people.reduce((sum, v) => sum + pick(v), 0) / people.length;
  return {
    tick: world.tick,
    population: people.length,
    food: Math.round(world.regions.reduce((sum, r) => sum + r.food, 0)),
    satiety: Math.round(mean((v) => v.satiety)),
    health: Math.round(mean((v) => v.health)),
    mood: Math.round(mean((v) => v.mood)),
    faith: Math.round(world.faith),
  };
}

type Bag = { names: string[]; amount: number; milestone?: boolean };

function bagOf(map: Map<string, Bag>, key: string): Bag {
  const existing = map.get(key);
  if (existing) return existing;
  const fresh: Bag = { names: [], amount: 0 };
  map.set(key, fresh);
  return fresh;
}

/** Turns the day's raw outcomes into the handful of lines worth recording. */
function summariseActions(
  world: World,
  ctx: TickContext,
  outcomes: Map<string, ActionOutcome>,
): SimEvent[] {
  const events: SimEvent[] = [];
  const harvests = new Map<string, Bag>();
  const builds = new Map<string, Bag>();
  const prayers = new Map<string, Bag>();
  const moves = new Map<string, Bag>();
  const regionName = (id: string) => ctx.regions.get(id)?.region.name ?? "未知之地";

  for (const outcome of outcomes.values()) {
    switch (outcome.kind) {
      case "farm":
      case "forage": {
        const bag = bagOf(harvests, outcome.regionId);
        bag.amount += outcome.amount;
        bag.names.push(outcome.name);
        break;
      }
      case "hunt": {
        if (outcome.success) {
          events.push(
            makeEvent(world.tick, outcome.amount >= 6 ? "notable" : "minor", {
              type: "hunt",
              region: regionName(outcome.regionId),
              regionId: outcome.regionId,
              amount: Math.round(outcome.amount * 10) / 10,
              name: outcome.name,
            }),
          );
        } else {
          events.push(
            makeEvent(world.tick, "minor", {
              type: "huntFail",
              region: regionName(outcome.regionId),
              regionId: outcome.regionId,
              name: outcome.name,
            }),
          );
        }
        if (outcome.injured) {
          events.push(
            makeEvent(world.tick, "notable", {
              type: "injury",
              name: outcome.name,
              id: outcome.villagerId,
              region: regionName(outcome.regionId),
              regionId: outcome.regionId,
            }),
          );
        }
        break;
      }
      case "build": {
        if (!outcome.success) break;
        const bag = bagOf(builds, outcome.regionId);
        bag.amount += outcome.amount;
        bag.names.push(outcome.name);
        if (outcome.milestone) bag.milestone = true;
        break;
      }
      case "pray": {
        const bag = bagOf(prayers, outcome.regionId);
        bag.names.push(outcome.name);
        break;
      }
      case "socialize": {
        if (outcome.crossing === "bond" && outcome.partnerName && bothAdults(world, outcome)) {
          events.push(
            makeEvent(world.tick, "minor", {
              type: "bond",
              a: outcome.name,
              b: outcome.partnerName,
              region: regionName(outcome.regionId),
              regionId: outcome.regionId,
            }),
          );
        }
        break;
      }
      case "migrate": {
        if (!outcome.targetRegionId) break;
        const villager = world.villagers.find((v) => v.id === outcome.villagerId);
        const reason = migrationReason(villager, ctx.regions.get(outcome.regionId)?.population ?? 0);
        const bag = bagOf(moves, `${outcome.regionId}>${outcome.targetRegionId}>${reason}`);
        bag.names.push(outcome.name);
        break;
      }
      default:
        break;
    }
    if (outcome.mastered) {
      events.push(
        makeEvent(world.tick, "notable", {
          type: "mastery",
          name: outcome.name,
          id: outcome.villagerId,
          title: SKILL_LABEL[outcome.mastered],
          region: regionName(outcome.regionId),
          regionId: outcome.regionId,
        }),
      );
    }
  }

  for (const [regionId, bag] of harvests) {
    if (bag.amount < 1.5) continue;
    events.push(
      // Only a genuinely big day earns a place in the unfiltered feed; routine
      // farming every third day drowns out everything that matters.
      makeEvent(world.tick, bag.amount >= 25 ? "notable" : "minor", {
        type: "harvest",
        region: regionName(regionId),
        regionId,
        amount: Math.round(bag.amount * 10) / 10,
        names: bag.names,
      }),
    );
  }
  for (const [regionId, bag] of builds) {
    events.push(
      makeEvent(world.tick, bag.milestone ? "notable" : "minor", {
        type: "build",
        region: regionName(regionId),
        regionId,
        names: bag.names,
        shelter: Math.round(ctx.regions.get(regionId)?.region.shelter ?? 0),
      }),
    );
  }
  for (const [regionId, bag] of prayers) {
    events.push(
      makeEvent(world.tick, "minor", {
        type: "prayer",
        region: regionName(regionId),
        regionId,
        names: bag.names,
        faith: Math.round(world.faith),
      }),
    );
  }
  for (const [key, bag] of moves) {
    const [fromId, toId, reason] = key.split(">");
    events.push(
      makeEvent(world.tick, "notable", {
        type: "migration",
        names: bag.names,
        from: regionName(fromId),
        fromId,
        to: regionName(toId),
        toId,
        reason: reason as "hunger" | "thirst" | "crowding" | "schism" | "curiosity",
      }),
    );
  }

  return events;
}

/** A child taking to a grown-up is not the kind of friendship worth recording. */
function bothAdults(world: World, outcome: ActionOutcome): boolean {
  const a = world.villagers.find((v) => v.id === outcome.villagerId);
  const b = world.villagers.find((v) => v.id === outcome.partnerId);
  return a !== undefined && b !== undefined && a.age >= 14 && b.age >= 14;
}

function migrationReason(
  villager: Villager | undefined,
  populationHere: number,
): "hunger" | "thirst" | "crowding" | "curiosity" {
  if (!villager) return "curiosity";
  if (villager.hydration < 35) return "thirst";
  if (villager.satiety < 45) return "hunger";
  if (populationHere > 9) return "crowding";
  return "curiosity";
}
