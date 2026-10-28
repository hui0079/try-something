"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { templateProvider, type NarrationProvider } from "@/lib/chronicle/provider";
import type { ChronicleEntry, RenderOptions } from "@/lib/chronicle/render";
import { loadLocal, parseSave, saveLocal } from "@/lib/save";
import type { InterventionKind, SimEvent } from "@/lib/sim/events";
import { applyIntervention } from "@/lib/sim/intervene";
import { DAYS_PER_YEAR } from "@/lib/sim/calendar";
import { advance } from "@/lib/sim/tick";
import type { World } from "@/lib/sim/types";
import { createWorld } from "@/lib/sim/world";

export const DEFAULT_SEED = "河湾之春";
export const SEED_PARAM = "seed";

/** Long games would otherwise grow the log without bound. */
const EVENT_LIMIT = 8000;
/** The feed keeps the recent annals. Two hundred years is more than a play session shows. */
const ENTRY_LIMIT = 200;
/**
 * How fast "自动" walks the years. 1× is one year a second, long enough to
 * read the annal that just appeared. Each step halves that.
 */
export const AUTOPLAY_SPEEDS = [
  { label: "1×", intervalMs: 1000 },
  { label: "2×", intervalMs: 500 },
  { label: "4×", intervalMs: 250 },
  { label: "8×", intervalMs: 120 },
] as const;
const AUTOSAVE_DELAY_MS = 400;

type Core = { world: World; events: SimEvent[] };

function trim(events: SimEvent[]): SimEvent[] {
  return events.length > EVENT_LIMIT ? events.slice(events.length - EVENT_LIMIT) : events;
}

function fresh(seed: string): Core {
  const { world, events } = createWorld(seed);
  return { world, events };
}

/** Newest day first: the player is watching time move, not reading from page one. */
function forFeed(entries: ChronicleEntry[]): ChronicleEntry[] {
  return entries.slice(Math.max(0, entries.length - ENTRY_LIMIT)).reverse();
}

/** A link that reopens this exact world from its seed. */
export function shareLink(seed: string): string {
  if (typeof window === "undefined") return seed;
  const url = new URL(window.location.href);
  url.search = `${SEED_PARAM}=${encodeURIComponent(seed)}`;
  url.hash = "";
  return url.toString();
}

/**
 * Where the game picks up from. A shared link wins over the autosave: someone
 * who follows a seed is asking to see that world, not their own. This reads the
 * browser directly, which is why the view is mounted client-side only.
 */
function bootstrap(seed: string): { core: Core; notice: string | null } {
  if (typeof window === "undefined") return { core: fresh(seed), notice: null };
  const shared = new URLSearchParams(window.location.search).get(SEED_PARAM)?.trim();
  if (shared) {
    return { core: fresh(shared), notice: `打开了分享来的世界，种子是「${shared}」。` };
  }
  const stored = loadLocal();
  if (stored) {
    return {
      core: { world: stored.world, events: stored.events },
      notice: "已接上上次中断的地方。",
    };
  }
  return { core: fresh(seed), notice: null };
}

export type ColonySession = {
  world: World;
  /** The raw log, which the biography view re-slices per person. */
  events: readonly SimEvent[];
  entries: ChronicleEntry[];
  /** True while an async narrator is still writing the feed. */
  narrating: boolean;
  chronicleRegionId: string | null;
  setChronicleRegionId: (value: string | null) => void;
  selectedVillagerId: string | null;
  setSelectedVillagerId: (value: string | null) => void;
  /** True only while time is actually running; extinction stops the clock. */
  playing: boolean;
  setAutoPlay: (value: boolean) => void;
  /** Label of the current auto-play speed, such as "2×". */
  autoSpeedLabel: string;
  /** Steps to the next speed, wrapping from the fastest back to 1×. */
  cycleAutoSpeed: () => void;
  notice: string | null;
  setNotice: (value: string | null) => void;
  extinct: boolean;
  advanceDays: (days: number) => void;
  intervene: (kind: InterventionKind, regionIds: string[]) => void;
  startNewWorld: (seed: string) => void;
  loadSaveText: (text: string) => void;
};

export type ColonyOptions = {
  seed?: string;
  /**
   * Where prose comes from. Swapping in an LLM-backed provider is the only
   * change needed to narrate with a model, and nothing else in the app has to
   * know which one is in use.
   */
  provider?: NarrationProvider;
};

export function useColony({
  seed: initialSeed = DEFAULT_SEED,
  provider = templateProvider,
}: ColonyOptions = {}): ColonySession {
  const [boot] = useState(() => bootstrap(initialSeed));
  const [core, setCore] = useState<Core>(boot.core);
  const [chronicleRegionId, setChronicleRegionId] = useState<string | null>(null);
  const [selectedVillagerId, setSelectedVillagerId] = useState<string | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const [autoSpeedIndex, setAutoSpeedIndex] = useState(0);
  const [notice, setNotice] = useState<string | null>(boot.notice);

  const extinct = core.world.villagers.length === 0;
  const playing = autoPlay && !extinct;

  const advanceDays = useCallback((days: number) => {
    setCore((prev) => {
      if (prev.world.villagers.length === 0) return prev;
      const result = advance(prev.world, days);
      return { world: result.world, events: trim([...prev.events, ...result.events]) };
    });
  }, []);

  const cycleAutoSpeed = useCallback(() => {
    setAutoSpeedIndex((index) => (index + 1) % AUTOPLAY_SPEEDS.length);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(
      () => advanceDays(DAYS_PER_YEAR),
      AUTOPLAY_SPEEDS[autoSpeedIndex].intervalMs,
    );
    return () => window.clearInterval(timer);
  }, [playing, advanceDays, autoSpeedIndex]);

  // Debounced so that holding "advance 30 days" does not serialise the world
  // on every single day.
  useEffect(() => {
    const timer = window.setTimeout(() => saveLocal(core.world, core.events), AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [core]);

  const intervene = useCallback((kind: InterventionKind, regionIds: string[]) => {
    setCore((prev) => {
      const result = applyIntervention(prev.world, kind, regionIds);
      if (!result.ok) {
        setNotice(result.error ?? "这件事做不到。");
        return prev;
      }
      return { world: result.world, events: trim([...prev.events, ...result.events]) };
    });
  }, []);

  const startNewWorld = useCallback((seed: string) => {
    const name = seed.trim() || DEFAULT_SEED;
    setCore(fresh(name));
    setAutoPlay(false);
    setSelectedVillagerId(null);
    setChronicleRegionId(null);
    setNotice(`新开了一个世界，种子是「${name}」。`);
  }, []);

  const loadSaveText = useCallback((text: string) => {
    const result = parseSave(text);
    if (!result.ok) {
      setNotice(`读档失败：${result.error}`);
      return;
    }
    setCore({ world: result.save.world, events: result.save.events });
    setAutoPlay(false);
    setSelectedVillagerId(null);
    setChronicleRegionId(null);
    setNotice("存档读取成功。");
  }, []);

  const options = useMemo<RenderOptions>(
    () => ({ regionId: chronicleRegionId ?? undefined, byYear: true }),
    [chronicleRegionId],
  );

  // A template provider answers immediately, which keeps the feed in step with
  // the world. An LLM provider would return a promise instead, so both are
  // handled: the synchronous result renders in the same paint, the async one
  // lands later and is tagged so a stale answer cannot overwrite a fresh one.
  const key = `${provider.id}|${core.events.length}|${chronicleRegionId ?? ""}`;
  const immediate = useMemo(() => {
    const result = provider.narrate(core.events, options);
    return result instanceof Promise ? null : forFeed(result);
  }, [provider, core.events, options]);
  const [deferred, setDeferred] = useState<{ key: string; entries: ChronicleEntry[] } | null>(null);

  useEffect(() => {
    if (immediate) return;
    let live = true;
    void Promise.resolve(provider.narrate(core.events, options)).then((result) => {
      if (live) setDeferred({ key, entries: forFeed(result) });
    });
    return () => {
      live = false;
    };
  }, [immediate, provider, core.events, options, key]);

  const fromProvider = immediate ?? (deferred?.key === key ? deferred.entries : null);

  return {
    world: core.world,
    events: core.events,
    entries: fromProvider ?? [],
    narrating: fromProvider === null,
    chronicleRegionId,
    setChronicleRegionId,
    selectedVillagerId,
    setSelectedVillagerId,
    playing,
    setAutoPlay,
    autoSpeedLabel: AUTOPLAY_SPEEDS[autoSpeedIndex].label,
    cycleAutoSpeed,
    notice,
    setNotice,
    extinct,
    advanceDays,
    intervene,
    startNewWorld,
    loadSaveText,
  };
}
