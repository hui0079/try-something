import { FORAGE_SEASON_FACTOR, FARM_SEASON_FACTOR } from "./calendar";
import { attractivenessOf, type TickContext } from "./context";
import { clamp01, ratio, shortfall } from "./math";
import type { Rng } from "./rng";
import { traitWeight } from "./traits";
import type { ActionKind, SkillKey, Villager, World } from "./types";

export type ActionChoice = {
  kind: ActionKind;
  score: number;
  /** Set for migrate. */
  targetRegionId?: string;
};

/** Below this, everything except eating, drinking and resting is put aside. */
const SURVIVAL_GATE = 20;

/** A migration has to look clearly better than staying put. */
const MIGRATION_THRESHOLD = 0.16;

/** How long a new home gets before anyone considers moving on again. */
const SETTLE_DAYS = 200;

/** Below this age nobody sends you to the fields. */
export const WORKING_AGE = 10;

const CHILD_ACTIONS: ReadonlySet<ActionKind> = new Set([
  "eat",
  "fetchWater",
  "rest",
  "socialize",
  "pray",
  "forage",
]);

const HUNT_SEASON_FACTOR: Record<string, number> = {
  spring: 1.0,
  summer: 0.95,
  autumn: 1.1,
  winter: 0.75,
};

const SALT_SEASON_FACTOR: Record<string, number> = {
  spring: 0.8,
  summer: 1.2,
  autumn: 1.5,
  winter: 0.5,
};

const BUILD_SEASON_FACTOR: Record<string, number> = {
  spring: 1.1,
  summer: 1.0,
  // High enough that some of the autumn workforce roofs the place instead of
  // farming, which is the difference between surviving winter and freezing.
  autumn: 2.1,
  winter: 1.6,
};

/** Nobody moves house in a blizzard, and arriving somewhere empty in winter is fatal. */
const MIGRATE_SEASON_FACTOR: Record<string, number> = {
  spring: 1.1,
  summer: 1,
  autumn: 0.9,
  winter: 0.4,
};

function skillFit(villager: Villager, skill: SkillKey): number {
  return 0.55 + (villager.skills[skill] / 100) * 0.8;
}

/**
 * Scores every action a villager could take today. Deterministic and free of
 * side effects, so balance can be reasoned about in tests.
 */
export function scoreActions(villager: Villager, world: World, ctx: TickContext): ActionChoice[] {
  const here = ctx.regions.get(villager.regionId);
  if (!here) return [{ kind: "rest", score: 0.01 }];
  const { region, population, effectiveWater, provisionNeed } = here;
  const { season } = ctx.calendar;

  const hunger = clamp01((100 - villager.satiety) / 100);
  const thirst = clamp01((100 - villager.hydration) / 100);
  const ill = clamp01((100 - villager.health) / 100);
  const sad = clamp01((100 - villager.mood) / 100);
  const desperate = villager.satiety < SURVIVAL_GATE || villager.hydration < SURVIVAL_GATE;

  const peers = ctx.totalPopulation > 1 ? population - 1 : 0;
  const isChild = villager.age < WORKING_AGE;
  const out: ActionChoice[] = [];
  const add = (kind: ActionKind, raw: number, targetRegionId?: string) => {
    if (raw <= 0) return;
    if (isChild && !CHILD_ACTIONS.has(kind)) return;
    const score = raw * traitWeight(villager.traits, kind);
    if (score <= 0) return;
    out.push(targetRegionId ? { kind, score, targetRegionId } : { kind, score });
  };

  // --- Survival -------------------------------------------------------------
  if (region.food >= 0.5 && villager.satiety < 88) {
    add("eat", Math.pow(hunger, 2) * 4);
  }
  if (effectiveWater > 1 && villager.hydration < 88) {
    add("fetchWater", Math.pow(thirst, 2) * 4.2);
  }
  // Lying down does not feed anyone. Damped while starving so that a villager
  // with nothing left locally flees instead of resting until they die.
  add("rest", Math.pow(ill, 1.4) * 1.9 * (desperate ? 0.25 : 1));

  // --- Getting food ---------------------------------------------------------
  const waterFactor = 0.3 + ratio(effectiveWater, region.waterCap) * 0.8;
  add(
    "farm",
    provisionNeed *
      1.5 *
      skillFit(villager, "farming") *
      FARM_SEASON_FACTOR[season] *
      (0.25 + ratio(region.fertility, 100) * 0.85) *
      waterFactor,
  );
  add(
    "hunt",
    provisionNeed *
      1.45 *
      skillFit(villager, "hunting") *
      Math.pow(ratio(region.game, region.gameCap), 0.7) *
      HUNT_SEASON_FACTOR[season],
  );
  // Foraging is the floor: always a little worthwhile, so nobody ever idles
  // into starvation just because the good options are gone.
  add(
    "forage",
    (provisionNeed * 0.75 + 0.12) *
      FORAGE_SEASON_FACTOR[season] *
      (0.5 + ratio(region.wood, region.woodCap) * 0.5),
  );

  // --- Longer horizon: only once today's survival is not in question --------
  if (!desperate) {
    const wantsStone = region.shelter > 45;
    const canBuild = region.wood >= 2 && (!wantsStone || region.stone >= 1.5);
    if (canBuild) {
      add(
        "build",
        shortfall(region.shelter, 75) *
          1.35 *
          skillFit(villager, "crafting") *
          BUILD_SEASON_FACTOR[season],
      );
    }
    add(
      "mine",
      shortfall(region.stone, 15) *
        0.85 *
        skillFit(villager, "crafting") *
        region.stoneRichness *
        (region.shelter < 80 ? 1 : 0.3),
    );
    if (region.hasSalt && region.salt > 1) {
      add(
        "gatherSalt",
        shortfall(world.saltStore, Math.max(6, ctx.totalPopulation * 5)) *
          0.95 *
          SALT_SEASON_FACTOR[season],
      );
    }
    if (peers > 0) {
      // A low floor on purpose: make idle chatter too attractive and the
      // settlement talks itself into a famine.
      add("socialize", sad * 0.9 + 0.08);
    }
    add(
      "pray",
      (sad * 0.55 + ill * 0.2) *
        (region.shrine ? 1.4 : 1) *
        (0.55 + ratio(world.faith, 100) * 0.6),
    );
  }

  // --- Moving on ------------------------------------------------------------
  let bestDelta = 0;
  let bestTarget: string | null = null;
  for (const id of region.neighbors) {
    const target = ctx.regions.get(id);
    if (!target) continue;
    // Judge the target as it would be with one more mouth in it.
    const delta =
      attractivenessOf(target.region, target.population + 1) - here.attractiveness;
    if (delta > bestDelta) {
      bestDelta = delta;
      bestTarget = id;
    }
  }
  // When the place has neither water nor food left, leaving stops being a
  // preference and becomes the only move that can save them.
  const localCollapse = effectiveWater <= 1 || region.food < 0.5 ? 0.6 : 0;
  // Having just arrived somewhere, you give it a year before uprooting again -
  // unless the land itself has run out, in which case nobody waits.
  const settled = world.tick - villager.movedTick < SETTLE_DAYS && localCollapse === 0;
  if (!settled && bestTarget && bestDelta > MIGRATION_THRESHOLD && villager.mood > 15) {
    add(
      "migrate",
      (clamp01(bestDelta * 2.2) + localCollapse) *
        1.5 *
        (0.6 + hunger * 0.8 + thirst * 1.2) *
        MIGRATE_SEASON_FACTOR[season],
      bestTarget,
    );
  }
  if (villager.mood < 25) {
    const hasWayOut = bestTarget && bestDelta > MIGRATION_THRESHOLD;
    add(
      "leave",
      Math.pow((25 - villager.mood) / 25, 1.5) * 1.8 * (0.5 + hunger) * (hasWayOut ? 0.5 : 1),
    );
  }

  if (out.length === 0) out.push({ kind: "rest", score: 0.01 });
  return out;
}

/**
 * Picks today's action. The multiplicative noise breaks ties and keeps two
 * identical villagers from marching in lockstep, without making anyone
 * choose something absurd.
 */
export function chooseAction(
  villager: Villager,
  world: World,
  ctx: TickContext,
  rng: Rng,
): ActionChoice {
  const candidates = scoreActions(villager, world, ctx);
  let best = candidates[0];
  let bestScore = -Infinity;
  for (const candidate of candidates) {
    const noisy = candidate.score * rng.range(0.88, 1.12);
    if (noisy > bestScore) {
      bestScore = noisy;
      best = candidate;
    }
  }
  return best;
}
