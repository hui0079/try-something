import { describe, expect, it } from "vitest";

import { parseSave, serialize } from "./save";
import { advance } from "./sim/tick";
import { createWorld } from "./sim/world";

function sample() {
  const { world, events } = createWorld("存档");
  const run = advance(world, 40);
  return { world: run.world, events: [...events, ...run.events] };
}

describe("save round trip", () => {
  it("restores a world that keeps simulating identically", () => {
    const { world, events } = sample();
    const parsed = parseSave(serialize(world, events));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.save.world).toEqual(world);
    expect(parsed.save.events).toEqual(events);
    // The real test of a save file: the future it produces is the same future.
    expect(advance(parsed.save.world, 30).world).toEqual(advance(world, 30).world);
  });

  it("keeps the event log intact", () => {
    const { world, events } = sample();
    const parsed = parseSave(serialize(world, events));
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.save.events).toHaveLength(events.length);
  });
});

describe("parseSave", () => {
  it("rejects text that is not JSON", () => {
    const result = parseSave("这不是 json");
    expect(result).toEqual({ ok: false, error: "这不是一个合法的 JSON 文件" });
  });

  it("rejects JSON from something else", () => {
    const result = parseSave(JSON.stringify({ kind: "some-other-game" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("不是聚落编年史");
  });

  it("rejects a save from an incompatible version", () => {
    const { world, events } = sample();
    const raw = JSON.parse(serialize(world, events));
    raw.version = 99;
    const result = parseSave(JSON.stringify(raw));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("99");
  });

  it("names the missing piece instead of failing vaguely", () => {
    const { world, events } = sample();
    const cases: Array<[string, string]> = [
      ["seed", "种子"],
      ["rngState", "随机数"],
      ["regions", "地块"],
      ["villagers", "居民"],
    ];
    for (const [field, expected] of cases) {
      const raw = JSON.parse(serialize(world, events));
      delete raw.world[field];
      const result = parseSave(JSON.stringify(raw));
      expect(result.ok, field).toBe(false);
      if (!result.ok) expect(result.error, field).toContain(expected);
    }
  });

  it("catches a corrupted region rather than loading a broken world", () => {
    const { world, events } = sample();
    const raw = JSON.parse(serialize(world, events));
    delete raw.world.regions[2].food;
    const result = parseSave(JSON.stringify(raw));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("资源数据损坏");
  });
});
