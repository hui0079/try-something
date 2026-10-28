import type { TickContext } from "../context";
import { addEffect, effectMagnitude } from "../effects";
import { makeEvent, type SimEvent } from "../events";
import type { Rng } from "../rng";
import type { World } from "../types";

/**
 * Daily chance that a crowded settlement falls sick on its own. Low on purpose:
 * a plague every other year stops being a catastrophe and becomes weather.
 */
const SICKNESS_CHANCE = 0.0004;
const CROWD_THRESHOLD = 4;

/**
 * Misfortune the player did not ask for. A world where every disaster is
 * player-triggered has no weather of its own, and the chronicle reads like a
 * list of the player's own button presses.
 */
export function stepHazards(world: World, ctx: TickContext, rng: Rng): SimEvent[] {
  const events: SimEvent[] = [];

  for (const [regionId, regionCtx] of ctx.regions) {
    if (regionCtx.population < CROWD_THRESHOLD) continue;
    if (effectMagnitude(world, "plague", regionId) > 0) continue;
    // Crowding and thin rations both invite illness.
    const pressure =
      1 + Math.max(0, regionCtx.population - 8) * 0.25 + (regionCtx.region.food < 2 ? 1.5 : 0);
    if (!rng.chance(SICKNESS_CHANCE * pressure)) continue;

    addEffect(world, {
      kind: "plague",
      daysLeft: rng.intBetween(5, 10),
      magnitude: 1,
      regionIds: [regionId],
    });
    events.push(
      makeEvent(world.tick, "major", {
        type: "plague",
        region: regionCtx.region.name,
        regionId,
        names: world.villagers.filter((v) => v.regionId === regionId).map((v) => v.name),
      }),
    );
  }

  return events;
}
