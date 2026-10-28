import { describe, expect, it } from "vitest";

import { advance } from "./tick";
import type { World } from "./types";
import { createWorld } from "./world";

const SEEDS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10"];
const DAYS = 500;

type Outcome = { seed: string; world: World; peak: number };

/**
 * The balance guard. Tuning a single number in the simulation can quietly turn
 * every settlement into either a graveyard or a utopia, and neither is playable,
 * so the shape of the population curve is asserted rather than eyeballed.
 */
function runAll(): Outcome[] {
  return SEEDS.map((seed) => {
    const { world } = createWorld(seed);
    let current = world;
    let peak = current.villagers.length;
    for (let block = 0; block < DAYS / 25; block += 1) {
      current = advance(current, 25).world;
      peak = Math.max(peak, current.villagers.length);
    }
    return { seed, world: current, peak };
  });
}

describe("balance", () => {
  const outcomes = runAll();

  it("keeps most settlements alive for 500 days", () => {
    const alive = outcomes.filter((o) => o.world.villagers.length > 0);
    expect(alive.length).toBeGreaterThanOrEqual(8);
  });

  it("never lets a settlement run away", () => {
    for (const { seed, peak } of outcomes) {
      expect(peak, seed).toBeLessThan(60);
    }
  });

  it("keeps every number finite and in range", () => {
    for (const { seed, world } of outcomes) {
      for (const villager of world.villagers) {
        for (const value of [villager.satiety, villager.hydration, villager.health, villager.mood]) {
          expect(Number.isFinite(value), seed).toBe(true);
          expect(value, seed).toBeGreaterThanOrEqual(0);
          expect(value, seed).toBeLessThanOrEqual(100);
        }
      }
      for (const region of world.regions) {
        expect(Number.isFinite(region.food), seed).toBe(true);
        expect(region.food, seed).toBeGreaterThanOrEqual(0);
        expect(region.water, seed).toBeLessThanOrEqual(region.waterCap);
      }
    }
  });

  it("grows past the founding party without exploding", () => {
    const grew = outcomes.filter((o) => o.peak > 6);
    expect(grew.length).toBeGreaterThanOrEqual(7);
  });

  it("spreads beyond the first region at least sometimes", () => {
    const spread = outcomes.filter(
      (o) => new Set(o.world.villagers.map((v) => v.regionId)).size > 1,
    );
    expect(spread.length).toBeGreaterThanOrEqual(1);
  });

  it("does not wear every field down to bare rock", () => {
    for (const { seed, world } of outcomes) {
      const best = Math.max(...world.regions.map((r) => r.fertility));
      expect(best, seed).toBeGreaterThan(20);
    }
  });

  it("leaves a granary somewhere in a surviving settlement", () => {
    for (const { seed, world } of outcomes) {
      if (world.villagers.length === 0) continue;
      const stored = world.regions.reduce((sum, r) => sum + r.food, 0);
      expect(stored, seed).toBeGreaterThan(0);
    }
  });
});
