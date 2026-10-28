import { describe, expect, it } from "vitest";

import { buildContext } from "./context";
import { Rng } from "./rng";
import { CAST_LIMIT, resolveClash, seatNewcomer, stepPolity } from "./systems/polity";
import type { Villager } from "./types";
import { createWorld } from "./world";

describe("the cast of fifty", () => {
  it("steps a marginal adult aside so a newborn keeps a name", () => {
    const { world } = createWorld("seat");
    const home = world.villagers[0].regionId;
    while (world.villagers.length < CAST_LIMIT) {
      const template = world.villagers[0];
      const copy: Villager = {
        ...template,
        id: `x${world.villagers.length}`,
        name: `人${world.villagers.length}`,
        age: 40,
        parents: [],
        partnerId: null,
        pregnancy: null,
        relations: {},
      };
      world.villagers.push(copy);
    }
    const mother = world.villagers.find((v) => v.sex === "f")!;
    const baby: Villager = {
      ...mother,
      id: "baby",
      name: "新儿",
      age: 0,
      parents: [mother.id],
      partnerId: null,
      pregnancy: null,
      relations: {},
    };
    world.villagers.push(baby);
    const events = seatNewcomer(world, baby);

    expect(world.villagers).toHaveLength(CAST_LIMIT);
    expect(world.villagers.some((v) => v.id === "baby")).toBe(true);
    expect(world.folk[home]).toBe(1);
    expect(world.kin).toHaveLength(1);
    expect(events[0]?.type).toBe("recede");
    expect(world.kin[0]?.id).not.toBe("baby");
    expect(world.kin[0]?.id).not.toBe(mother.id);
  });
});

describe("orders and dynasties", () => {
  it("forms an order once a place is crowded enough", () => {
    const { world } = createWorld("org");
    const home = world.villagers[0].regionId;
    world.tick = 30;
    world.folk[home] = 12;
    const events = stepPolity(world, buildContext(world), new Rng(3));
    expect(world.orders.some((order) => order.regionId === home)).toBe(true);
    expect(events.some((event) => event.type === "order")).toBe(true);
  });

  it("raises a dynasty out of an old order", () => {
    const { world } = createWorld("realm");
    const home = world.villagers[0].regionId;
    const leader = world.villagers[0];
    world.tick = 390;
    world.folk[home] = 20;
    world.orders.push({
      id: "o1",
      name: "林氏",
      kind: "clan",
      regionId: home,
      leaderId: leader.id,
      formedTick: 0,
    });
    const events = stepPolity(world, buildContext(world), new Rng(4));
    expect(world.realms).toHaveLength(1);
    expect(world.realms[0]?.rulerId).toBe(leader.id);
    expect(events.some((event) => event.type === "realm")).toBe(true);
  });

  it("sends two armed houses to war across a border", () => {
    const { world } = createWorld("war");
    const [rulerA, rulerB] = world.villagers;
    rulerA.regionId = "riverbend";
    rulerB.regionId = "southSlope";
    world.tick = 200;
    world.folk.riverbend = 8;
    world.folk.southSlope = 8;
    world.realms.push(
      {
        id: "k1",
        name: "林朝",
        era: "禾初",
        house: "林",
        rulerId: rulerA.id,
        heirId: null,
        regionIds: ["riverbend"],
        arms: 20,
        formedTick: 0,
        lastWarTick: 0,
      },
      {
        id: "k2",
        name: "桑朝",
        era: "开石",
        house: "桑",
        rulerId: rulerB.id,
        heirId: null,
        regionIds: ["southSlope"],
        arms: 20,
        formedTick: 0,
        lastWarTick: 0,
      },
    );
    const events = resolveClash(world, buildContext(world), new Rng(5));
    expect(events.some((event) => event.type === "battle")).toBe(true);
    expect(world.realms.every((realm) => realm.arms < 20)).toBe(true);
  });
});
