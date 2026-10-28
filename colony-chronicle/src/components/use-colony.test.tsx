import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { NarrationProvider } from "@/lib/chronicle/provider";
import { renderChronicle } from "@/lib/chronicle/render";
import { serialize } from "@/lib/save";
import { advance } from "@/lib/sim/tick";
import { createWorld } from "@/lib/sim/world";

import { shareLink, useColony } from "./use-colony";

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
});

describe("useColony", () => {
  it("advances the world and keeps the log growing", () => {
    const { result } = renderHook(() => useColony({ seed: "钩子" }));
    expect(result.current.world.tick).toBe(0);
    const opening = result.current.events.length;
    act(() => result.current.advanceDays(10));
    expect(result.current.world.tick).toBe(10);
    expect(result.current.events.length).toBeGreaterThan(opening);
  });

  it("stops the clock when nobody is left", () => {
    const { world, events } = createWorld("绝境");
    const run = advance(world, 30);
    const emptied = { ...run.world, villagers: [] };

    const { result } = renderHook(() => useColony({ seed: "绝境" }));
    act(() => result.current.loadSaveText(serialize(emptied, [...events, ...run.events])));
    expect(result.current.extinct).toBe(true);

    act(() => result.current.setAutoPlay(true));
    act(() => result.current.advanceDays(30));
    expect(result.current.world.tick).toBe(30);
    expect(result.current.playing).toBe(false);
  });

  it("refuses an intervention it cannot pay for and says why", () => {
    const { result } = renderHook(() => useColony({ seed: "囊中" }));
    act(() => result.current.intervene("digCanal", ["riverbend", "southSlope"]));
    act(() => result.current.intervene("digCanal", ["riverbend", "oakwood"]));
    expect(result.current.notice).toBe("影响力不够");
  });

  it("reopens a shared seed instead of the autosave", () => {
    const first = renderHook(() => useColony({ seed: "本地" }));
    act(() => first.result.current.advanceDays(5));
    first.unmount();

    window.history.replaceState(null, "", "/?seed=" + encodeURIComponent("别人的世界"));
    const { result } = renderHook(() => useColony({ seed: "本地" }));
    expect(result.current.world.seed).toBe("别人的世界");
    expect(result.current.world.tick).toBe(0);
  });

  it("picks up an exported save, day and all", () => {
    const { world, events } = createWorld("旧档");
    const run = advance(world, 77);
    const text = serialize(run.world, [...events, ...run.events]);

    const { result } = renderHook(() => useColony({ seed: "新档" }));
    act(() => result.current.loadSaveText(text));
    expect(result.current.world.seed).toBe("旧档");
    expect(result.current.world.tick).toBe(77);
  });

  it("explains a bad save rather than loading nothing", () => {
    const { result } = renderHook(() => useColony({ seed: "坏档" }));
    act(() => result.current.loadSaveText("{}"));
    expect(result.current.notice).toContain("读档失败");
    expect(result.current.world.seed).toBe("坏档");
  });

  it("autosaves so the next session resumes where this one stopped", async () => {
    vi.useFakeTimers();
    try {
      const { result, unmount } = renderHook(() => useColony({ seed: "续上" }));
      act(() => result.current.advanceDays(12));
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      unmount();
      const second = renderHook(() => useColony({ seed: "无关" }));
      expect(second.result.current.world.seed).toBe("续上");
      expect(second.result.current.world.tick).toBe(12);
      expect(second.result.current.notice).toBe("已接上上次中断的地方。");
    } finally {
      vi.useRealTimers();
    }
  });

  it("waits for an async narrator without blocking the world", async () => {
    let resolve: (() => void) | null = null;
    const slow: NarrationProvider = {
      id: "slow",
      label: "慢笔",
      narrate: (events, options) =>
        new Promise((done) => {
          resolve = () => done(renderChronicle(events, options));
        }),
    };

    const { result } = renderHook(() => useColony({ seed: "慢笔", provider: slow }));
    expect(result.current.narrating).toBe(true);
    expect(result.current.entries).toEqual([]);
    // The simulation does not wait on prose.
    act(() => result.current.advanceDays(3));
    expect(result.current.world.tick).toBe(3);

    await act(async () => {
      resolve?.();
    });
    await waitFor(() => expect(result.current.narrating).toBe(false));
    expect(result.current.entries.length).toBeGreaterThan(0);
  });
});

describe("shareLink", () => {
  it("carries only the seed", () => {
    window.history.replaceState(null, "", "/?seed=old&noise=1#here");
    expect(shareLink("新种子")).toBe(`${window.location.origin}/?seed=${encodeURIComponent("新种子")}`);
  });
});
