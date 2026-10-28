import { describe, expect, it } from "vitest";

import { DAYS_PER_YEAR } from "./calendar";
import { advance, tick } from "./tick";
import type { World } from "./types";
import { createWorld } from "./world";

function run(seed: string, days: number) {
  const { world } = createWorld(seed);
  return advance(world, days);
}

function invariants(world: World) {
  for (const villager of world.villagers) {
    expect(villager.satiety).toBeGreaterThanOrEqual(0);
    expect(villager.satiety).toBeLessThanOrEqual(100);
    expect(villager.hydration).toBeGreaterThanOrEqual(0);
    expect(villager.hydration).toBeLessThanOrEqual(100);
    expect(villager.health).toBeGreaterThan(0);
    expect(villager.health).toBeLessThanOrEqual(100);
    expect(villager.mood).toBeGreaterThanOrEqual(0);
    expect(villager.mood).toBeLessThanOrEqual(100);
    expect(Number.isFinite(villager.age)).toBe(true);
    expect(world.regions.some((r) => r.id === villager.regionId)).toBe(true);
  }
  for (const region of world.regions) {
    expect(region.food).toBeGreaterThanOrEqual(0);
    expect(region.water).toBeGreaterThanOrEqual(0);
    expect(region.water).toBeLessThanOrEqual(region.waterCap);
    expect(region.game).toBeLessThanOrEqual(region.gameCap);
    expect(region.wood).toBeLessThanOrEqual(region.woodCap);
    expect(region.fertility).toBeGreaterThanOrEqual(0);
    expect(region.fertility).toBeLessThanOrEqual(100);
    expect(region.shelter).toBeGreaterThanOrEqual(0);
    expect(region.shelter).toBeLessThanOrEqual(100);
  }
  expect(world.faith).toBeGreaterThanOrEqual(0);
  expect(world.faith).toBeLessThanOrEqual(100);
}

describe("tick", () => {
  it("leaves the previous world untouched", () => {
    const { world } = createWorld("不变");
    const before = structuredClone(world);
    tick(world);
    expect(world).toEqual(before);
  });

  it("replays identically from the same seed", () => {
    const a = run("重放", 120);
    const b = run("重放", 120);
    expect(a.world).toEqual(b.world);
    expect(a.events).toEqual(b.events);
  });

  it("resumes identically from a mid-run state", () => {
    const { world } = createWorld("续跑");
    const half = advance(world, 60);
    const straight = advance(world, 120);
    const resumed = advance(half.world, 60);
    expect(resumed.world).toEqual(straight.world);
  });

  it("advances the calendar one day at a time", () => {
    const { world } = createWorld("日历");
    const founders = new Map(world.villagers.map((v) => [v.id, v.age]));
    // One extra day: birthdays land on the first day of the new year, which is
    // the tick after a full year has been simulated.
    const { world: later } = advance(world, DAYS_PER_YEAR + 1);
    expect(later.tick).toBe(DAYS_PER_YEAR + 1);
    expect(later.history).toHaveLength(DAYS_PER_YEAR + 1);
    for (const villager of later.villagers) {
      const before = founders.get(villager.id);
      if (before === undefined) continue; // born during the year
      expect(villager.age).toBe(before + 1);
    }
  });

  it("holds its invariants and keeps the settlement alive over 200 days", () => {
    const { world } = run("两百天", 200);
    invariants(world);
    expect(world.villagers.length).toBeGreaterThan(0);
    expect(world.villagers.length).toBeLessThan(60);
  });

  it("writes a year summary at the end of every year", () => {
    const { events } = run("年鉴", DAYS_PER_YEAR * 2);
    const summaries = events.filter((e) => e.type === "yearSummary");
    expect(summaries).toHaveLength(2);
    expect(summaries[0]).toMatchObject({ year: 1 });
    expect(summaries[1]).toMatchObject({ year: 2 });
  });

  it("stamps every event with the day it happened on", () => {
    const { events } = run("纪日", 30);
    for (const event of events) {
      expect(event.tick).toBeGreaterThanOrEqual(0);
      expect(event.tick).toBeLessThan(30);
    }
  });

  it("produces something worth reading rather than silence", () => {
    const { events } = run("有话说", 200);
    const notable = events.filter((e) => e.severity !== "minor");
    expect(notable.length).toBeGreaterThan(10);
    expect(new Set(events.map((e) => e.type)).size).toBeGreaterThan(6);
  });
});
