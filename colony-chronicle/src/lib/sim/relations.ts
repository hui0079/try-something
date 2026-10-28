import { clamp } from "./math";
import type { Villager } from "./types";

export const BOND_THRESHOLD = 70;
export const FEUD_THRESHOLD = -60;

/**
 * Past this point a relationship is settled and stops drifting back toward
 * indifference. Without it, daily decay pulls a pair back under the bond
 * threshold and they "become close friends" again every other week.
 */
/** A bond (70) and a feud (-60) both sit past this, so neither drifts back. */
const SETTLED = 58;

export type RelationCrossing = "bond" | "feud" | null;

export function relationBetween(a: Villager, b: Villager): number {
  return a.relations[b.id] ?? 0;
}

/**
 * Relations are kept symmetric: one number per pair, mirrored on both sides.
 * Returns the threshold that was crossed by this change, if any, so the caller
 * can emit the event where it happened.
 */
export function adjustRelation(a: Villager, b: Villager, delta: number): RelationCrossing {
  const before = relationBetween(a, b);
  const after = clamp(before + delta, -100, 100);
  a.relations[b.id] = after;
  b.relations[a.id] = after;
  if (before < BOND_THRESHOLD && after >= BOND_THRESHOLD) return "bond";
  if (before > FEUD_THRESHOLD && after <= FEUD_THRESHOLD) return "feud";
  return null;
}

/** Below this a grudge has a memory. Daily decay used to forgive it before it could become a feud. */
const GRUDGE = -20;

export function decayRelations(villager: Villager, amount: number): void {
  for (const [id, value] of Object.entries(villager.relations)) {
    if (value >= SETTLED || value <= GRUDGE) continue;
    if (value > 0) villager.relations[id] = Math.max(0, value - amount);
    else if (value < 0) villager.relations[id] = Math.min(0, value + amount);
  }
}

export function forgetVillager(villagers: readonly Villager[], goneId: string): void {
  for (const v of villagers) delete v.relations[goneId];
}
