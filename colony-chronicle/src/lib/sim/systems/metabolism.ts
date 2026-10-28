import { METABOLISM_SEASON_FACTOR } from "../calendar";
import type { TickContext } from "../context";
import { effectMagnitude } from "../effects";
import { makeEvent, type SimEvent } from "../events";
import { clamp, ratio } from "../math";
import type { World } from "../types";
import { HEAVY_ACTIONS, type ActionOutcome } from "./actions";
import { WORKING_AGE } from "../decide";

const DISTRESS = 20;

/**
 * Burns rations, applies the day's damage, and drifts mood toward whatever the
 * villager's circumstances justify. Everything that can kill someone happens
 * here or in the population system, never scattered across the action code.
 */
export function stepMetabolism(
  world: World,
  ctx: TickContext,
  outcomes: Map<string, ActionOutcome>,
): SimEvent[] {
  const { season } = ctx.calendar;
  const cold = season === "winter" || world.weather === "coldSnap";
  const newlyStarving = new Map<string, string[]>();
  const newlyThirsting = new Map<string, string[]>();

  for (const villager of world.villagers) {
    const region = ctx.regions.get(villager.regionId);
    const worked = HEAVY_ACTIONS.has(outcomes.get(villager.id)?.kind ?? "rest");
    const childFactor = villager.age < WORKING_AGE ? 0.6 : 1;

    const wasFed = villager.satiety >= DISTRESS;
    const wasWatered = villager.hydration >= DISTRESS;

    villager.satiety = clamp(
      villager.satiety -
        11 * METABOLISM_SEASON_FACTOR[season] * (worked ? 1.15 : 1) * childFactor,
      0,
      100,
    );
    // Kept low on purpose: a steeper thirst curve pushes so much of the day
    // into hauling water that nobody has time to farm, and the colony starves.
    villager.hydration = clamp(
      villager.hydration -
        10 * (season === "summer" || world.weather === "drought" ? 1.25 : 1) * childFactor,
      0,
      100,
    );

    // --- Health ------------------------------------------------------------
    let damage = 0;
    if (villager.satiety < DISTRESS) {
      damage += ((DISTRESS - villager.satiety) / DISTRESS) * 3.5;
      villager.harmCause = "starvation";
    }
    if (villager.hydration < DISTRESS) {
      // Thirst kills quicker than hunger.
      damage += ((DISTRESS - villager.hydration) / DISTRESS) * 5;
      villager.harmCause = "thirst";
    }
    const shelter = region?.region.shelter ?? 0;
    if (cold && shelter < 40) {
      damage += ((40 - shelter) / 40) * (world.weather === "coldSnap" ? 2 : 1.4);
      if (damage > 0) villager.harmCause = "cold";
    }
    const plague = effectMagnitude(world, "plague", villager.regionId);
    if (plague > 0) {
      damage += 3 * plague;
      villager.harmCause = "plague";
    }
    if (villager.age > 50) {
      damage += (villager.age - 50) * 0.03;
    }

    if (damage > 0) {
      villager.health = clamp(villager.health - damage, 0, 100);
    } else if (villager.health > 0 && villager.satiety > 55 && villager.hydration > 50) {
      villager.health = clamp(villager.health + 1.6, 0, 100);
      if (villager.health >= 100) villager.harmCause = null;
    }

    // --- Mood --------------------------------------------------------------
    const population = region?.population ?? 1;
    const crowding = population > 9 ? (population - 9) * 1.5 : 0;
    const faithLift = ratio(world.faith, 100) * (villager.traits.includes("devout") ? 8 : 2);
    const weatherMood =
      world.weather === "storm" || world.weather === "coldSnap"
        ? -4
        : world.weather === "clear"
          ? 1
          : 0;
    const blessing = effectMagnitude(world, "blessing", villager.regionId) * 6;
    const target = clamp(
      50 +
        (villager.satiety - 50) * 0.25 +
        (villager.health - 50) * 0.2 +
        (shelter - 40) * 0.05 +
        faithLift +
        weatherMood +
        blessing -
        crowding,
      0,
      100,
    );
    villager.mood = clamp(villager.mood + (target - villager.mood) * 0.18, 0, 100);

    // --- Distress notices --------------------------------------------------
    if (wasFed && villager.satiety < DISTRESS && region) {
      const list = newlyStarving.get(region.region.id) ?? [];
      list.push(villager.name);
      newlyStarving.set(region.region.id, list);
    }
    if (wasWatered && villager.hydration < DISTRESS && region) {
      const list = newlyThirsting.get(region.region.id) ?? [];
      list.push(villager.name);
      newlyThirsting.set(region.region.id, list);
    }
  }

  const events: SimEvent[] = [];
  for (const [regionId, names] of newlyStarving) {
    const region = ctx.regions.get(regionId)?.region;
    if (!region) continue;
    events.push(
      makeEvent(world.tick, "major", {
        type: "starving",
        region: region.name,
        regionId,
        names,
      }),
    );
  }
  for (const [regionId, names] of newlyThirsting) {
    const region = ctx.regions.get(regionId)?.region;
    if (!region) continue;
    events.push(
      makeEvent(world.tick, "major", {
        type: "thirsting",
        region: region.name,
        regionId,
        names,
      }),
    );
  }
  return events;
}
