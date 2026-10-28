import { describe, expect, it } from "vitest";

import { normalizeWatchlist } from "@/lib/market/watchlist";

describe("normalizeWatchlist", () => {
  it("allows an empty watchlist", () => {
    expect(normalizeWatchlist(["", "  "])).toEqual({ codes: [] });
  });

  it("keeps a newly added code and drops duplicates", () => {
    expect(normalizeWatchlist(["600519", "600036", "600519"])).toEqual({
      codes: ["600519", "600036"],
    });
  });
});