import { describe, expect, it } from "vitest";

import { createWorld, FOUNDER_COUNT, REGION_IDS } from "./world";

describe("createWorld", () => {
  it("is fully determined by the seed", () => {
    const a = createWorld("云隙");
    const b = createWorld("云隙");
    expect(a.world).toEqual(b.world);
  });

  it("gives different seeds different worlds", () => {
    const a = createWorld("云隙");
    const b = createWorld("石缝");
    expect(a.world).not.toEqual(b.world);
  });

  it("settles the founders together with a starting granary", () => {
    const { world, events } = createWorld("初春");
    expect(world.villagers).toHaveLength(FOUNDER_COUNT);
    const homes = new Set(world.villagers.map((v) => v.regionId));
    expect(homes.size).toBe(1);
    const home = world.regions.find((r) => r.id === [...homes][0])!;
    expect(home.food).toBeGreaterThan(0);
    expect(events[0].type).toBe("founding");
  });

  it("includes both sexes so the settlement is not sterile by bad luck", () => {
    for (const seed of ["a", "b", "c", "d", "e"]) {
      const { world } = createWorld(seed);
      expect(world.villagers.some((v) => v.sex === "f")).toBe(true);
      expect(world.villagers.some((v) => v.sex === "m")).toBe(true);
    }
  });

  it("wires region links symmetrically", () => {
    const { world } = createWorld("对称");
    for (const region of world.regions) {
      for (const id of region.neighbors) {
        const other = world.regions.find((r) => r.id === id);
        expect(other, `${region.id} -> ${id}`).toBeDefined();
        expect(other!.neighbors).toContain(region.id);
      }
    }
  });

  it("gives every founder a name of their own", () => {
    const { world } = createWorld("同名");
    expect(new Set(world.villagers.map((v) => v.name)).size).toBe(FOUNDER_COUNT);
  });

  it("keeps every region inside its own caps", () => {
    const { world } = createWorld("上限");
    expect(world.regions.map((r) => r.id)).toEqual(REGION_IDS);
    for (const region of world.regions) {
      expect(region.water).toBeLessThanOrEqual(region.waterCap);
      expect(region.game).toBeLessThanOrEqual(region.gameCap);
      expect(region.wood).toBeLessThanOrEqual(region.woodCap);
      expect(region.fertility).toBeLessThanOrEqual(100);
    }
  });
});
