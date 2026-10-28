import { describe, expect, it } from "vitest";

import { DAYS_PER_YEAR } from "./calendar";
import type { EventType, SimEvent } from "./events";
import { advance } from "./tick";
import type { World } from "./types";
import { createWorld } from "./world";

// A founding party in its twenties does not start dying for two decades, so the
// horizon has to be long enough for the first generation to be buried.
const SEEDS = ["s4", "s8", "s10"];
const YEARS = 35;

type Arc = { seed: string; world: World; events: SimEvent[] };

function count(events: readonly SimEvent[], type: EventType): number {
  return events.filter((e) => e.type === type).length;
}

/**
 * The 500-day balance guard proves a settlement can survive. This one asks the
 * harder question the game actually depends on: over a lifetime, does anything
 * happen? A simulation that neither kills nor divides anybody produces a
 * chronicle with nothing to read.
 */
function runArcs(): Arc[] {
  return SEEDS.map((seed) => {
    const opening = createWorld(seed);
    let current = opening.world;
    const events = [...opening.events];
    for (let year = 0; year < YEARS; year += 1) {
      const result = advance(current, DAYS_PER_YEAR);
      current = result.world;
      events.push(...result.events);
    }
    return { seed, world: current, events };
  });
}

describe("the long arc", () => {
  const arcs = runArcs();
  const all = arcs.flatMap((a) => a.events);

  it("turns over the generations", () => {
    for (const { seed, events } of arcs) {
      expect(count(events, "birth"), `${seed} 无人出生`).toBeGreaterThan(5);
      expect(count(events, "death"), `${seed} 无人死去`).toBeGreaterThanOrEqual(2);
    }
  });

  it("kills people for more than one reason", () => {
    const causes = new Set(
      all.filter((e) => e.type === "death").map((e) => (e as { cause: string }).cause),
    );
    expect(causes.size).toBeGreaterThan(1);
  });

  it("lets a settlement fall out with itself", () => {
    const fallings =
      count(all, "feud") + count(all, "faction") + count(all, "schism") + count(all, "departure");
    expect(fallings).toBeGreaterThan(0);
  });

  it("does not turn the chronicle into travel notes", () => {
    // People moving house every few days was once the single loudest thing in
    // the log; a settled colony should move a handful of times a year at most.
    for (const { seed, events } of arcs) {
      expect(count(events, "migration") / YEARS, `${seed} 迁徙过于频繁`).toBeLessThan(8);
    }
  });

  it("keeps plague rare enough to still be news", () => {
    for (const { seed, events } of arcs) {
      expect(count(events, "plague") / YEARS, `${seed} 瘟疫过于频繁`).toBeLessThan(0.5);
    }
  });

  it("leaves most settlements standing after a lifetime", () => {
    const alive = arcs.filter((a) => a.world.villagers.length > 0);
    expect(alive.length).toBeGreaterThanOrEqual(SEEDS.length - 1);
    for (const { seed, world } of arcs) {
      expect(world.villagers.length, seed).toBeLessThan(60);
    }
  });

  it("never lets one household bear a child every season", () => {
    for (const { seed, world } of arcs) {
      const byMother = new Map<string, number[]>();
      for (const person of [...world.villagers, ...world.graves]) {
        const motherId = "parents" in person ? person.parents[0] : undefined;
        if (!motherId) continue;
        const list = byMother.get(motherId) ?? [];
        list.push(person.bornTick);
        byMother.set(motherId, list);
      }
      for (const [motherId, ticks] of byMother) {
        const sorted = [...ticks].sort((a, b) => a - b);
        for (let i = 1; i < sorted.length; i += 1) {
          expect(sorted[i] - sorted[i - 1], `${seed} ${motherId}`).toBeGreaterThan(DAYS_PER_YEAR * 2);
        }
      }
    }
  });
});
