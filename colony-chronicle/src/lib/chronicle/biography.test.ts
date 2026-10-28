import { describe, expect, it } from "vitest";

import { makeEvent } from "@/lib/sim/events";
import { advance } from "@/lib/sim/tick";
import { createWorld } from "@/lib/sim/world";

import { findPerson, lifeOf, mentions } from "./biography";

const subject = { id: "v3", name: "石禾" };

describe("mentions", () => {
  it("matches on id where the event carries one", () => {
    const event = makeEvent(4, "major", {
      type: "death",
      name: "别人",
      id: "v3",
      age: 40,
      cause: "age",
      region: "河湾",
      regionId: "riverbend",
    });
    expect(mentions(event, subject)).toBe(true);
  });

  it("matches on name in a list when the day was worth recording", () => {
    const event = makeEvent(4, "notable", {
      type: "harvest",
      region: "河湾",
      regionId: "riverbend",
      amount: 30,
      names: ["林渠", "石禾"],
    });
    expect(mentions(event, subject)).toBe(true);
  });

  it("leaves routine workdays out of a life story", () => {
    const event = makeEvent(4, "minor", {
      type: "harvest",
      region: "河湾",
      regionId: "riverbend",
      amount: 3,
      names: ["林渠", "石禾"],
    });
    expect(mentions(event, subject)).toBe(false);
  });

  it("matches either side of a pairing", () => {
    const event = makeEvent(4, "major", {
      type: "pairing",
      a: "石禾",
      b: "苇舟",
      region: "河湾",
      regionId: "riverbend",
    });
    expect(mentions(event, subject)).toBe(true);
    expect(mentions(event, { id: "vX", name: "苇舟" })).toBe(true);
  });

  it("leaves other people's events alone", () => {
    const event = makeEvent(4, "notable", {
      type: "hunt",
      region: "橡林",
      regionId: "oakwood",
      amount: 8,
      name: "岩弓",
    });
    expect(mentions(event, subject)).toBe(false);
  });
});

describe("lifeOf", () => {
  it("keeps the log index so line ids stay stable", () => {
    const events = [
      makeEvent(1, "minor", { type: "season", season: "spring", year: 1 }),
      makeEvent(2, "notable", {
        type: "injury",
        name: "石禾",
        id: "v3",
        region: "河湾",
        regionId: "riverbend",
      }),
    ];
    expect(lifeOf(events, subject)).toEqual([{ event: events[1], index: 1 }]);
  });

  it("gives every founder a story once the world has run a while", () => {
    const { world, events: opening } = createWorld("生平");
    const run = advance(world, 120);
    const log = [...opening, ...run.events];
    const founders = world.villagers;
    for (const founder of founders) {
      expect(lifeOf(log, founder).length, founder.name).toBeGreaterThan(0);
    }
  });
});

describe("findPerson", () => {
  it("finds the living and the dead, and nobody else", () => {
    const { world } = createWorld("名录");
    const run = advance(world, 400);
    const living = run.world.villagers[0];
    expect(findPerson(run.world, living.id)).toEqual({ kind: "living", villager: living });
    const gone = run.world.graves[0];
    if (gone) expect(findPerson(run.world, gone.id)).toEqual({ kind: "gone", grave: gone });
    expect(findPerson(run.world, "v99999")).toBeNull();
  });
});
