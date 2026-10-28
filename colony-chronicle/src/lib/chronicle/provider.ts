import type { SimEvent } from "@/lib/sim/events";

import { renderChronicle, type ChronicleEntry, type RenderOptions } from "./render";

/**
 * The seam for narration. The template provider needs no network, no key and no
 * budget, which is what lets the simulation be tuned by replaying hundreds of
 * days in a test. An LLM provider would implement the same interface and rewrite
 * a day's lines into prose - it reads events and returns text, and must never be
 * able to touch world state.
 */
export type NarrationProvider = {
  id: string;
  label: string;
  narrate(
    events: readonly SimEvent[],
    options?: RenderOptions,
  ): ChronicleEntry[] | Promise<ChronicleEntry[]>;
};

export const templateProvider: NarrationProvider = {
  id: "template",
  label: "模板叙述",
  narrate: (events, options) => renderChronicle(events, options),
};

