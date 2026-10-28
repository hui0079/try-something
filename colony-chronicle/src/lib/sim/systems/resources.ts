import type { TickContext } from "../context";
import { makeEvent, type SimEvent } from "../events";
import { clamp, clamp01 } from "../math";
import type { Region, Season, World } from "../types";
import { WATER_GAIN } from "./weather";

const EVAPORATION_BY_SEASON: Record<Season, number> = {
  spring: 1.1,
  summer: 1.9,
  autumn: 1.0,
  winter: 0.5,
};

const GROWTH_BY_SEASON: Record<Season, number> = {
  spring: 1.2,
  summer: 1.1,
  autumn: 0.9,
  winter: 0.5,
};

/** Base share of the granary lost to rot and vermin each day. */
const FOOD_DECAY = 0.008;

/** Runs before people act, so today's rain is available to today's irrigation. */
export function regenerateResources(world: World, ctx: TickContext): void {
  const { season } = ctx.calendar;
  const growth = GROWTH_BY_SEASON[season];
  const rain = WATER_GAIN[world.weather];
  const evaporation =
    EVAPORATION_BY_SEASON[season] * (world.weather === "drought" ? 2.2 : 1);

  const rechargeFactor = world.weather === "drought" ? 0.15 : 1;

  for (const region of world.regions) {
    region.water = clamp(
      region.water + region.waterRecharge * rechargeFactor + rain - evaporation,
      0,
      region.waterCap,
    );

    // Logistic regrowth with a small floor, so a hunted-out region can come
    // back instead of being dead forever.
    region.game = clamp(
      region.game + (0.035 * region.game * (1 - region.game / region.gameCap) + 0.08) * growth,
      0,
      region.gameCap,
    );
    region.wood = clamp(
      region.wood + (0.05 * region.wood * (1 - region.wood / region.woodCap) + 0.05) * growth,
      0,
      region.woodCap,
    );
    // Recovery accelerates as the soil empties, which is what gives a worn-out
    // region a way back. With a flat rate, the first region a colony over-farms
    // stays dead forever and the colony dies with it.
    region.fertility = clamp(
      region.fertility + (0.2 + 0.7 * (1 - region.fertility / 100)) * growth,
      0,
      100,
    );
    if (region.hasSalt && (world.weather === "clear" || world.weather === "drought")) {
      region.salt = clamp(region.salt + 0.2, 0, 100);
    }
  }

  equaliseCanals(world);
}

/** Canals bleed water between connected regions toward a shared level. */
function equaliseCanals(world: World): void {
  const byId = new Map(world.regions.map((r) => [r.id, r]));
  const transfers: Array<[Region, Region, number]> = [];
  for (const region of world.regions) {
    for (const id of region.channels) {
      // Handle each pair once.
      if (region.id >= id) continue;
      const other = byId.get(id);
      if (!other) continue;
      const levelA = region.water / region.waterCap;
      const levelB = other.water / other.waterCap;
      const flow = (levelA - levelB) * 0.12 * Math.min(region.waterCap, other.waterCap);
      if (flow !== 0) transfers.push([region, other, flow]);
    }
  }
  for (const [from, to, flow] of transfers) {
    const moved = clamp(flow, -to.water, from.water);
    from.water = clamp(from.water - moved, 0, from.waterCap);
    to.water = clamp(to.water + moved, 0, to.waterCap);
  }
}

/** Runs after people act: spoilage, wear, and the depletion notices. */
export function settleResources(world: World, ctx: TickContext): SimEvent[] {
  const saltCoverage = clamp01(world.saltStore / Math.max(1, ctx.totalPopulation * 6));
  const decay = FOOD_DECAY * clamp(1 - saltCoverage * 0.6, 0.4, 1);
  const shelterWear = world.weather === "storm" ? 1.5 : 0.12;

  for (const region of world.regions) {
    region.food = Math.max(0, region.food * (1 - decay));
    region.shelter = clamp(region.shelter - shelterWear, 0, 100);
  }
  world.saltStore = Math.max(0, world.saltStore - ctx.totalPopulation * 0.02);

  return depletionEvents(world, ctx);
}

/**
 * `low` raises the alarm, `high` clears it. The gap matters: a granary that
 * hovers on a single threshold would announce its own ruin and rescue every
 * other day, which is what made the chronicle unreadable.
 */
const WATCHED = [
  { key: "water", low: 8, high: 25, label: "water" },
  { key: "game", low: 6, high: 20, label: "game" },
  { key: "wood", low: 4, high: 15, label: "wood" },
  { key: "fertility", low: 15, high: 35, label: "fertility" },
  { key: "food", low: 0.5, high: 12, label: "food" },
] as const;

/**
 * Recovery is only worth reporting for something the chronicle already mourned,
 * so each alarm is remembered on the world until it is cleared.
 */
function depletionEvents(world: World, ctx: TickContext): SimEvent[] {
  const events: SimEvent[] = [];
  const ringing = new Set(world.alarms);

  for (const region of world.regions) {
    const inhabited = (ctx.regions.get(region.id)?.population ?? 0) > 0;

    for (const watch of WATCHED) {
      const key = `${region.id}:${watch.label}`;
      const now = region[watch.key];
      const famine = watch.label === "food";

      if (!ringing.has(key)) {
        // Nobody starves in a region nobody lives in.
        if (now >= watch.low || (famine && !inhabited)) continue;
        ringing.add(key);
        events.push(
          makeEvent(world.tick, famine ? "major" : inhabited ? "notable" : "minor", {
            type: "depleted",
            region: region.name,
            regionId: region.id,
            resource: watch.label,
          }),
        );
        continue;
      }

      if (famine && !inhabited) {
        // Everyone left or died; there is no rescue left to report.
        ringing.delete(key);
        continue;
      }
      if (now < watch.high) continue;
      ringing.delete(key);
      events.push(
        makeEvent(world.tick, famine ? "notable" : "minor", {
          type: "recovered",
          region: region.name,
          regionId: region.id,
          resource: watch.label,
        }),
      );
    }
  }

  world.alarms = [...ringing];
  return events;
}
