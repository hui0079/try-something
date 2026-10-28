import { type Calendar, calendarOf } from "./calendar";
import { ratio, shortfall } from "./math";
import type { Region, World } from "./types";

/** Rations one adult burns per day, in food units. */
export const RATION_PER_DAY = 0.48;

/**
 * Days of stock the settlement tries to keep, by season. The autumn figure has
 * to cover the whole winter, because frozen ground produces almost nothing.
 */
const BUFFER_DAYS: Record<Calendar["season"], number> = {
  spring: 12,
  summer: 14,
  autumn: 40,
  winter: 20,
};

export type RegionContext = {
  region: Region;
  population: number;
  /** Water the region can actually draw on, canals included. */
  effectiveWater: number;
  /** 0..1, how far the granary is below its seasonal target. */
  provisionNeed: number;
  /** 0..1, how appealing this place looks to someone deciding where to live. */
  attractiveness: number;
};

export type TickContext = {
  calendar: Calendar;
  totalPopulation: number;
  regions: Map<string, RegionContext>;
};

function effectiveWaterOf(region: Region, byId: Map<string, Region>): number {
  let best = region.water;
  for (const id of region.channels) {
    const neighbor = byId.get(id);
    // A canal shares a neighbour's water, but hauling loses some of it.
    if (neighbor) best = Math.max(best, neighbor.water * 0.85);
  }
  return best;
}

/**
 * How appealing a place looks to someone deciding where to live. Standing stock
 * counts for less than the land's potential on purpose: an empty region has an
 * empty granary, and weighting food too heavily would make every unsettled
 * valley look like a famine and freeze the colony in place until it starved.
 */
export function attractivenessOf(region: Region, population: number): number {
  const foodPerHead = region.food / Math.max(1, population);
  const base =
    ratio(foodPerHead, 10) * 0.32 +
    ratio(region.water, region.waterCap) * 0.2 +
    ratio(region.fertility, 100) * 0.22 +
    ratio(region.shelter, 100) * 0.16 +
    ratio(region.game, region.gameCap) * 0.1;
  // Crowding has to come off the home score rather than be added to the move,
  // or a packed village can never look worse than empty land and the colony
  // stays in one region forever.
  const crowding = Math.max(0, population - 8) * 0.03;
  // Somewhere you cannot drink is worth nothing however full the granary is.
  const thirstFactor = 0.35 + 0.65 * ratio(region.water, region.waterCap);
  return Math.max(0, base * thirstFactor - crowding);
}

export function buildContext(world: World): TickContext {
  const calendar = calendarOf(world.tick);
  const byId = new Map(world.regions.map((r) => [r.id, r]));

  const population = new Map<string, number>();
  for (const region of world.regions) population.set(region.id, 0);
  for (const villager of world.villagers) {
    population.set(villager.regionId, (population.get(villager.regionId) ?? 0) + 1);
  }

  const regions = new Map<string, RegionContext>();
  for (const region of world.regions) {
    const pop = population.get(region.id) ?? 0;
    const target = Math.max(4, pop * BUFFER_DAYS[calendar.season] * RATION_PER_DAY);
    regions.set(region.id, {
      region,
      population: pop,
      effectiveWater: effectiveWaterOf(region, byId),
      provisionNeed: shortfall(region.food, target),
      attractiveness: attractivenessOf(region, pop),
    });
  }

  return { calendar, totalPopulation: world.villagers.length, regions };
}
