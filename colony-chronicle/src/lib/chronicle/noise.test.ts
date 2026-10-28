import { describe, expect, it } from "vitest";

import { DAYS_PER_YEAR } from "@/lib/sim/calendar";
import type { SimEvent } from "@/lib/sim/events";
import { advance } from "@/lib/sim/tick";
import { createWorld } from "@/lib/sim/world";

import { renderChronicle } from "./render";

const SEEDS = ["n1", "n2", "n3", "n4", "n5"];
const YEARS = 5;

function logFor(seed: string): SimEvent[] {
  const { world, events } = createWorld(seed);
  const run = advance(world, DAYS_PER_YEAR * YEARS);
  return [...events, ...run.events];
}

const logs = SEEDS.map((seed) => ({ seed, events: logFor(seed) }));

/**
 * The acceptance test for the chronicle is that it reads like a chronicle. That
 * cannot be asserted directly, but the two ways it goes wrong can be: the same
 * sentence over and over, and a scarcity that announces its own ruin and rescue
 * on alternate days.
 */
describe("chronicle noise", () => {
  it("never reports a recovery that was not first reported as a loss", () => {
    for (const { seed, events } of logs) {
      const ringing = new Set<string>();
      for (const event of events) {
        if (event.type !== "depleted" && event.type !== "recovered") continue;
        const key = `${event.regionId}:${event.resource}`;
        if (event.type === "depleted") {
          expect(ringing.has(key), `${seed} 重复报告${key}告急`).toBe(false);
          ringing.add(key);
        } else {
          expect(ringing.has(key), `${seed} 凭空报告${key}缓解`).toBe(true);
          ringing.delete(key);
        }
      }
    }
  });

  it("does not repeat one sentence through a whole year", () => {
    for (const { seed, events } of logs) {
      for (let year = 0; year < YEARS; year += 1) {
        const from = year * DAYS_PER_YEAR;
        const slice = events.filter(
          (e) => e.tick >= from && e.tick < from + DAYS_PER_YEAR && e.severity !== "minor",
        );
        const counts = new Map<string, number>();
        for (const entry of renderChronicle(slice, { minSeverity: "notable" })) {
          for (const line of entry.lines) {
            counts.set(line.text, (counts.get(line.text) ?? 0) + 1);
          }
        }
        for (const [text, count] of counts) {
          expect(count, `${seed} 第 ${year + 1} 年：「${text}」`).toBeLessThanOrEqual(4);
        }
      }
    }
  });

  it("writes something worth reading in most years", () => {
    for (const { seed, events } of logs) {
      const entries = renderChronicle(events, { minSeverity: "notable" });
      expect(entries.length, seed).toBeGreaterThan(YEARS * 5);
      const major = entries.flatMap((e) => e.lines).filter((l) => l.severity === "major");
      expect(major.length, seed).toBeGreaterThan(0);
    }
  });
});
