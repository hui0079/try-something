import { describe, expect, it, vi } from "vitest";

import { TrendCache } from "../cache";
import type { TrendAdapter } from "../types";

const item = {
  rank: 1,
  title: "测试热点",
  url: "https://example.com/topic",
};

function adapter(fetch: TrendAdapter["fetch"]): TrendAdapter {
  return { id: "zhihu", name: "知乎", fetch };
}

describe("TrendCache", () => {
  it("reuses fresh data until the TTL expires", async () => {
    const fetch = vi.fn().mockResolvedValue([item]);
    const cache = new TrendCache(30 * 60 * 1000);

    await cache.load(adapter(fetch), { now: 1_000 });
    const result = await cache.load(adapter(fetch), { now: 60_000 });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.stale).toBe(false);
    expect(result.updatedAt).toBe(1_000);
  });

  it("force refresh bypasses a fresh cached value", async () => {
    const fetch = vi.fn().mockResolvedValue([item]);
    const cache = new TrendCache();

    await cache.load(adapter(fetch), { now: 1_000 });
    await cache.load(adapter(fetch), { force: true, now: 2_000 });

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("deduplicates concurrent upstream requests", async () => {
    let resolveFetch: (items: typeof item[]) => void = () => undefined;
    const fetch = vi.fn(
      () =>
        new Promise<typeof item[]>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const cache = new TrendCache();
    const source = adapter(fetch);

    const first = cache.load(source, { now: 1_000 });
    const second = cache.load(source, { now: 1_000 });
    resolveFetch([item]);

    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("returns stale data when a refresh fails", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce([item])
      .mockRejectedValueOnce(new Error("upstream blocked"));
    const cache = new TrendCache();
    const source = adapter(fetch);

    await cache.load(source, { now: 1_000 });
    const result = await cache.load(source, { force: true, now: 2_000 });

    expect(result.items).toEqual([item]);
    expect(result.stale).toBe(true);
    expect(result.error).toBe("upstream blocked");
  });
});
