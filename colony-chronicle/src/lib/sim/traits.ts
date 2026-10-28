import type { ActionKind, Trait } from "./types";

export const TRAIT_LABEL: Record<Trait, string> = {
  greedy: "贪婪",
  devout: "虔诚",
  lazy: "懒惰",
  curious: "好奇",
  stoic: "坚忍",
  hotheaded: "暴躁",
  nurturing: "慈爱",
};

export const ALL_TRAITS = Object.keys(TRAIT_LABEL) as Trait[];

/**
 * Multiplies the utility of an action. Anything omitted is 1.
 * These are the knobs that make two villagers in identical circumstances
 * choose differently, which is where most of the emergent texture comes from.
 */
const WEIGHTS: Record<Trait, Partial<Record<ActionKind, number>>> = {
  greedy: { farm: 1.2, hunt: 1.2, mine: 1.15, gatherSalt: 1.2, socialize: 0.8, pray: 0.8 },
  devout: { pray: 2.4, rest: 0.9, hunt: 0.9 },
  lazy: { farm: 0.6, hunt: 0.6, mine: 0.55, build: 0.6, forage: 0.85, rest: 1.35, socialize: 1.25 },
  curious: { migrate: 1.6, forage: 1.25, hunt: 1.1, rest: 0.85 },
  stoic: { leave: 0.35, rest: 0.8, build: 1.15, farm: 1.1 },
  hotheaded: { hunt: 1.35, socialize: 0.75, leave: 1.25, build: 0.9 },
  nurturing: { socialize: 1.35, build: 1.2, rest: 1.1, leave: 0.7 },
};

export function traitWeight(traits: readonly Trait[], action: ActionKind): number {
  let weight = 1;
  for (const trait of traits) {
    weight *= WEIGHTS[trait][action] ?? 1;
  }
  return weight;
}

export function describeTraits(traits: readonly Trait[]): string {
  if (traits.length === 0) return "平凡";
  return traits.map((t) => TRAIT_LABEL[t]).join("、");
}
