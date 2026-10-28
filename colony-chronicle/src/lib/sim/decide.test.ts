import { describe, expect, it } from "vitest";

import { buildContext } from "./context";
import { scoreActions } from "./decide";
import type { ActionKind, Villager, World } from "./types";
import { createWorld } from "./world";

function setup(seed = "决策") {
  const { world } = createWorld(seed);
  return world;
}

function best(world: World, villager: Villager): ActionKind {
  const ctx = buildContext(world);
  const scored = scoreActions(villager, world, ctx);
  return scored.reduce((a, b) => (b.score > a.score ? b : a)).kind;
}

function scoreFor(world: World, villager: Villager, kind: ActionKind): number {
  const ctx = buildContext(world);
  return scoreActions(villager, world, ctx).find((c) => c.kind === kind)?.score ?? 0;
}

describe("scoreActions", () => {
  it("puts eating first when someone is starving and there is food", () => {
    const world = setup();
    const villager = world.villagers[0];
    villager.satiety = 10;
    villager.hydration = 90;
    expect(best(world, villager)).toBe("eat");
  });

  it("puts water first when thirst is worse than hunger", () => {
    const world = setup();
    const villager = world.villagers[0];
    villager.satiety = 45;
    villager.hydration = 5;
    expect(best(world, villager)).toBe("fetchWater");
  });

  it("does not offer eating when the granary is empty", () => {
    const world = setup();
    const home = world.regions.find((r) => r.id === world.villagers[0].regionId)!;
    home.food = 0;
    const villager = world.villagers[0];
    villager.satiety = 10;
    expect(scoreFor(world, villager, "eat")).toBe(0);
  });

  it("always leaves foraging on the table so nobody idles into starvation", () => {
    const world = setup();
    const home = world.regions.find((r) => r.id === world.villagers[0].regionId)!;
    home.food = 0;
    home.game = 0;
    home.wood = 0;
    home.fertility = 0;
    home.water = 0;
    expect(scoreFor(world, world.villagers[0], "forage")).toBeGreaterThan(0);
  });

  it("drops leisure and long-term work while survival is in question", () => {
    const world = setup();
    const villager = world.villagers[0];
    villager.satiety = 8;
    villager.mood = 10;
    expect(scoreFor(world, villager, "pray")).toBe(0);
    expect(scoreFor(world, villager, "socialize")).toBe(0);
    expect(scoreFor(world, villager, "build")).toBe(0);
  });

  it("loses interest in hunting as the game runs out", () => {
    const world = setup();
    const home = world.regions.find((r) => r.id === world.villagers[0].regionId)!;
    home.food = 0;
    const villager = world.villagers[0];
    villager.satiety = 60;
    home.game = home.gameCap;
    const plenty = scoreFor(world, villager, "hunt");
    home.game = 1;
    const scarce = scoreFor(world, villager, "hunt");
    expect(scarce).toBeLessThan(plenty * 0.4);
  });

  it("keeps children away from adult work", () => {
    const world = setup();
    const child = world.villagers[0];
    child.age = 5;
    const ctx = buildContext(world);
    const kinds = scoreActions(child, world, ctx).map((c) => c.kind);
    expect(kinds).not.toContain("farm");
    expect(kinds).not.toContain("hunt");
    expect(kinds).not.toContain("build");
  });

  it("offers a move toward a visibly better neighbour", () => {
    const world = setup();
    const villager = world.villagers[0];
    const home = world.regions.find((r) => r.id === villager.regionId)!;
    home.food = 0;
    home.water = 1;
    home.fertility = 5;
    const target = world.regions.find((r) => home.neighbors.includes(r.id))!;
    target.food = 200;
    target.water = target.waterCap;
    target.shelter = 90;
    villager.satiety = 40;
    const ctx = buildContext(world);
    const move = scoreActions(villager, world, ctx).find((c) => c.kind === "migrate");
    expect(move?.targetRegionId).toBe(target.id);
  });

  it("only considers walking out when morale has collapsed", () => {
    const world = setup();
    const villager = world.villagers[0];
    villager.mood = 60;
    expect(scoreFor(world, villager, "leave")).toBe(0);
    villager.mood = 5;
    expect(scoreFor(world, villager, "leave")).toBeGreaterThan(0);
  });

  it("lets traits pull identical villagers apart", () => {
    const world = setup();
    const [plain, devout] = world.villagers;
    plain.traits = [];
    devout.traits = ["devout"];
    for (const v of [plain, devout]) {
      v.satiety = 70;
      v.hydration = 70;
      v.mood = 35;
      v.health = 80;
      v.regionId = plain.regionId;
      v.skills = { farming: 30, hunting: 30, crafting: 30, healing: 30 };
    }
    devout.regionId = plain.regionId;
    expect(scoreFor(world, devout, "pray")).toBeGreaterThan(scoreFor(world, plain, "pray") * 2);
  });
});
