import { describe, expect, it } from "vitest";

import { nextQuoteGapMs, OPEN_QUOTE_GAP_MS, QUOTE_GAP_CAP_MS } from "@/lib/market/pace";

describe("quote pace", () => {
  it("waits twenty seconds between successful open-market quotes", () => {
    expect(nextQuoteGapMs(0)).toBe(OPEN_QUOTE_GAP_MS);
  });

  it("backs off after failures and stays under the cap", () => {
    expect(nextQuoteGapMs(1)).toBe(40_000);
    expect(nextQuoteGapMs(8)).toBe(QUOTE_GAP_CAP_MS);
  });
});
