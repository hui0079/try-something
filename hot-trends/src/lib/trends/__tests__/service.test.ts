import { describe, expect, it } from "vitest";

import { TrendCache } from "../cache";
import { aggregateTrends } from "../service";
import type { TrendAdapter } from "../types";

const successful: TrendAdapter = {
  id: "zhihu",
  name: "知乎",
  fetch: async () => [
    { rank: 1, title: "正常热点", url: "https://example.com/ok" },
  ],
};

const failing: TrendAdapter = {
  id: "weibo",
  name: "微博",
  fetch: async () => {
    throw new Error("请求被拒绝");
  },
};

describe("aggregateTrends", () => {
  it("isolates a failed platform from successful platforms", async () => {
    const result = await aggregateTrends(
      [successful, failing],
      new TrendCache(),
      { now: 1_700_000_000_000 },
    );

    expect(result.updatedAt).toBe("2023-11-14T22:13:20.000Z");
    expect(result.platforms).toEqual([
      expect.objectContaining({
        platform: "zhihu",
        status: "ok",
        items: expect.arrayContaining([
          expect.objectContaining({ title: "正常热点" }),
        ]),
      }),
      {
        platform: "weibo",
        name: "微博",
        status: "unavailable",
        items: [],
        error: "请求被拒绝",
      },
    ]);
  });
});
