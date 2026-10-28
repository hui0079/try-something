import { FORAGE_SEASON_FACTOR, FARM_SEASON_FACTOR } from "../calendar";
import type { TickContext } from "../context";
import type { ActionChoice } from "../decide";
import { clamp, ratio } from "../math";
import { adjustRelation, type RelationCrossing } from "../relations";
import type { Rng } from "../rng";
import type { ActionKind, Region, SkillKey, Villager, World } from "../types";
import { FOOD_TO_SATIETY } from "../world";
import { FARM_WEATHER_FACTOR } from "./weather";

export type ActionOutcome = {
  villagerId: string;
  name: string;
  kind: ActionKind;
  regionId: string;
  /** Food gained, shelter built, salt cut - meaning depends on the action. */
  amount: number;
  success: boolean;
  targetRegionId?: string;
  partnerId?: string;
  partnerName?: string;
  crossing?: RelationCrossing;
  injured?: boolean;
  /** Set when a skill crosses from journeyman into something the village would name. */
  mastered?: SkillKey;
  /** Set when this day's building finishes a roof the chronicle should mention. */
  milestone?: boolean;
};

/** Actions that burn extra rations. */
export const HEAVY_ACTIONS: ReadonlySet<ActionKind> = new Set<ActionKind>([
  "farm",
  "hunt",
  "forage",
  "build",
  "mine",
  "gatherSalt",
  "migrate",
]);

function skillFit(villager: Villager, skill: SkillKey): number {
  return 0.55 + (villager.skills[skill] / 100) * 0.8;
}

const MASTERY = 72;

function learn(villager: Villager, skill: SkillKey, amount: number): SkillKey | null {
  const before = villager.skills[skill];
  villager.skills[skill] = clamp(before + amount, 0, 100);
  return before < MASTERY && villager.skills[skill] >= MASTERY ? skill : null;
}

function bestChannelSource(world: World, region: Region): Region | null {
  let best: Region | null = null;
  for (const id of region.channels) {
    const other = world.regions.find((r) => r.id === id);
    if (other && other.water > 3 && (!best || other.water > best.water)) best = other;
  }
  return best;
}

function healerPresent(world: World, regionId: string, selfId: string): boolean {
  return world.villagers.some(
    (v) => v.regionId === regionId && v.id !== selfId && v.skills.healing > 45,
  );
}

export function executeAction(
  world: World,
  villager: Villager,
  choice: ActionChoice,
  ctx: TickContext,
  rng: Rng,
): ActionOutcome {
  const here = ctx.regions.get(villager.regionId);
  const region = here?.region;
  const outcome: ActionOutcome = {
    villagerId: villager.id,
    name: villager.name,
    kind: choice.kind,
    regionId: villager.regionId,
    amount: 0,
    success: true,
  };
  villager.lastAction = choice.kind;
  if (!region || !here) return outcome;

  const { season } = ctx.calendar;

  switch (choice.kind) {
    case "eat": {
      const want = clamp((100 - villager.satiety) / FOOD_TO_SATIETY, 0.5, 3);
      const taken = Math.min(region.food, want);
      region.food -= taken;
      villager.satiety = clamp(villager.satiety + taken * FOOD_TO_SATIETY, 0, 100);
      villager.mood = clamp(villager.mood + 1, 0, 100);
      outcome.amount = taken;
      outcome.success = taken > 0.05;
      break;
    }

    case "fetchWater": {
      const local = region.water > 1 ? region : bestChannelSource(world, region);
      if (!local) {
        outcome.success = false;
        break;
      }
      // Scraping the last of a drying source gets you less than a full skin.
      const plenty = Math.min(1, local.water / 8);
      const haulPenalty = local === region ? 1 : 0.82;
      local.water = Math.max(0, local.water - 0.35);
      villager.hydration = clamp(
        villager.hydration + Math.max(25, 75 * plenty) * haulPenalty,
        0,
        100,
      );
      outcome.amount = 1;
      break;
    }

    case "farm": {
      const waterFactor = 0.3 + ratio(here.effectiveWater, region.waterCap) * 0.8;
      const yielded =
        3.6 *
        skillFit(villager, "farming") *
        FARM_SEASON_FACTOR[season] *
        (0.3 + ratio(region.fertility, 100) * 0.9) *
        waterFactor *
        FARM_WEATHER_FACTOR[world.weather] *
        rng.range(0.85, 1.15);
      region.food += yielded;
      region.fertility = Math.max(0, region.fertility - 0.6);
      region.water = Math.max(0, region.water - 0.6);
      outcome.mastered = learn(villager, "farming", 0.35) ?? undefined;
      outcome.amount = yielded;
      break;
    }

    case "hunt": {
      const chance = clamp(
        0.35 + (villager.skills.hunting / 100) * 0.45 + ratio(region.game, region.gameCap) * 0.25,
        0.15,
        0.92,
      );
      if (rng.chance(chance)) {
        const bagged = 2.2 + (villager.skills.hunting / 100) * 2.4 + rng.range(0, 1.5);
        const taken = Math.min(bagged, region.game);
        // Only part of the bag comes out of the breeding stock, which is what
        // lets a hunted region recover instead of being emptied in a week.
        region.game = Math.max(0, region.game - taken * 0.55);
        region.food += taken;
        outcome.mastered = learn(villager, "hunting", 0.5) ?? undefined;
        outcome.amount = taken;
      } else {
        outcome.mastered = learn(villager, "hunting", 0.2) ?? undefined;
        outcome.success = false;
      }
      // The woods bite back, and the reckless get bitten more.
      const risk =
        0.035 *
        (1 - villager.skills.hunting / 200) *
        (villager.traits.includes("hotheaded") ? 1.4 : 1);
      if (rng.chance(risk)) {
        // Most maulings heal. A few do not, which is what keeps "died in the woods"
        // from disappearing once old age becomes the ordinary way to go.
        const fatal = rng.chance(0.12);
        villager.health = fatal ? 0 : clamp(villager.health - rng.range(12, 30), 0, 100);
        villager.harmCause = "beast";
        outcome.injured = true;
      }
      break;
    }

    case "forage": {
      const gathered =
        1.1 *
        FORAGE_SEASON_FACTOR[season] *
        rng.range(0.55, 1.05) *
        (0.6 + ratio(region.wood, region.woodCap) * 0.6);
      region.food += gathered * 0.75;
      region.wood = clamp(region.wood + gathered * 0.5, 0, region.woodCap);
      outcome.amount = gathered * 0.75;
      break;
    }

    case "build": {
      const needsStone = region.shelter > 45;
      if (region.wood < 2 || (needsStone && region.stone < 1.5)) {
        outcome.success = false;
        break;
      }
      region.wood -= 2.2;
      if (needsStone) region.stone -= 1.5;
      const built = 1.6 * skillFit(villager, "crafting") * rng.range(0.85, 1.15);
      const before = region.shelter;
      region.shelter = clamp(region.shelter + built, 0, 100);
      outcome.milestone =
        (before < 55 && region.shelter >= 55) || (before < 85 && region.shelter >= 85);
      outcome.mastered = learn(villager, "crafting", 0.4) ?? undefined;
      outcome.amount = built;
      break;
    }

    case "mine": {
      const cut = 2.6 * skillFit(villager, "crafting") * (0.4 + region.stoneRichness * 0.9);
      region.stone += cut;
      outcome.mastered = learn(villager, "crafting", 0.25) ?? undefined;
      outcome.amount = cut;
      break;
    }

    case "gatherSalt": {
      const cut = Math.min(region.salt, 1.4 * rng.range(0.7, 1.2));
      region.salt -= cut;
      world.saltStore += cut;
      outcome.amount = cut;
      outcome.success = cut > 0.05;
      break;
    }

    case "socialize": {
      const peers = world.villagers.filter(
        (v) => v.regionId === villager.regionId && v.id !== villager.id,
      );
      const partner = rng.weighted(peers, (p) => (villager.relations[p.id] ?? 0) + 35);
      if (!partner) {
        outcome.success = false;
        break;
      }
      outcome.crossing = adjustRelation(villager, partner, rng.range(5, 9));
      villager.mood = clamp(villager.mood + 6, 0, 100);
      partner.mood = clamp(partner.mood + 6, 0, 100);
      outcome.partnerId = partner.id;
      outcome.partnerName = partner.name;
      break;
    }

    case "pray": {
      world.faith = clamp(world.faith + (region.shrine ? 0.75 : 0.45), 0, 100);
      const lift = 4 + ratio(world.faith, 100) * 4 + (villager.traits.includes("devout") ? 3 : 0);
      villager.mood = clamp(villager.mood + lift, 0, 100);
      outcome.amount = lift;
      break;
    }

    case "rest": {
      const care = healerPresent(world, villager.regionId, villager.id) ? 1.5 : 0;
      villager.health = clamp(villager.health + 3 + care, 0, 100);
      villager.mood = clamp(villager.mood + 1.5, 0, 100);
      outcome.amount = 3 + care;
      break;
    }

    case "migrate": {
      if (!choice.targetRegionId) {
        outcome.success = false;
        break;
      }
      villager.regionId = choice.targetRegionId;
      villager.movedTick = world.tick;
      outcome.targetRegionId = choice.targetRegionId;
      break;
    }

    case "leave": {
      // The actual removal happens in the population system, which owns graves.
      break;
    }
  }

  return outcome;
}
