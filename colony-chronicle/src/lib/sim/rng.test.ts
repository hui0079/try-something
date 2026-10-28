import { describe, expect, it } from "vitest";

import { Rng, seedToState } from "./rng";

describe("Rng", () => {
  it("replays the same stream from the same state", () => {
    const a = new Rng(seedToState("河湾"));
    const b = new Rng(seedToState("河湾"));
    const left = Array.from({ length: 20 }, () => a.next());
    const right = Array.from({ length: 20 }, () => b.next());
    expect(left).toEqual(right);
  });

  it("gives different streams for different seeds", () => {
    const a = new Rng(seedToState("河湾"));
    const b = new Rng(seedToState("南坡"));
    expect(a.next()).not.toEqual(b.next());
  });

  it("resumes exactly where a saved state left off", () => {
    const original = new Rng(seedToState("盐沼"));
    for (let i = 0; i < 7; i += 1) original.next();
    const resumed = new Rng(original.state);
    expect(resumed.next()).toEqual(new Rng(original.state).next());
  });

  it("stays inside its bounds", () => {
    const rng = new Rng(12345);
    for (let i = 0; i < 500; i += 1) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      expect(rng.int(5)).toBeLessThan(5);
      const between = rng.intBetween(3, 6);
      expect(between).toBeGreaterThanOrEqual(3);
      expect(between).toBeLessThanOrEqual(6);
    }
  });

  it("shuffles without mutating or losing elements", () => {
    const rng = new Rng(999);
    const source = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = rng.shuffled(source);
    expect(source).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...shuffled].sort((x, y) => x - y)).toEqual(source);
  });

  it("weights choices and rejects an all-zero pool", () => {
    const rng = new Rng(7);
    expect(rng.weighted([{ w: 0 }, { w: 0 }], (i) => i.w)).toBeNull();
    const only = rng.weighted([{ w: 0 }, { w: 3 }], (i) => i.w);
    expect(only?.w).toBe(3);
  });
});
