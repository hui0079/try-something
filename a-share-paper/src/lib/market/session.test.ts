import { describe, expect, it } from "vitest";

import { nextQuoteAt, tradeGate } from "@/lib/market/session";

const at = (iso: string) => new Date(iso);

describe("tradeGate", () => {
  it("is open during the Shanghai continuous auction", () => {
    expect(
      tradeGate({
        now: at("2026-10-28T02:32:00Z"),
        indexDate: "2026-10-28",
        volumeUnchanged: false,
        quotesStale: false,
      }).open,
    ).toBe(true);
    expect(
      tradeGate({
        now: at("2026-10-28T05:00:00Z"),
        indexDate: "2026-10-28",
        volumeUnchanged: true,
        quotesStale: false,
      }).label,
    ).toBe("连续竞价");
  });

  it("stays closed on weekends, at the closing auction, and on a stale index date", () => {
    expect(
      tradeGate({
        now: at("2026-10-31T02:32:00Z"),
        indexDate: "2026-10-31",
        volumeUnchanged: false,
        quotesStale: false,
      }).label,
    ).toBe("休市");
    expect(
      tradeGate({
        now: at("2026-10-28T06:57:00Z"),
        indexDate: "2026-10-28",
        volumeUnchanged: false,
        quotesStale: false,
      }).open,
    ).toBe(false);
    expect(
      tradeGate({
        now: at("2026-10-28T02:32:00Z"),
        indexDate: "2026-10-27",
        volumeUnchanged: false,
        quotesStale: false,
      }).open,
    ).toBe(false);
  });

  it("schedules the next quote at the next fixed session", () => {
    expect(nextQuoteAt(at("2026-10-28T00:00:00Z")).toISOString()).toBe("2026-10-28T01:30:00.000Z");
    expect(nextQuoteAt(at("2026-10-28T03:40:00Z")).toISOString()).toBe("2026-10-28T05:00:00.000Z");
    expect(nextQuoteAt(at("2026-10-28T07:00:00Z")).toISOString()).toBe("2026-10-29T01:30:00.000Z");
    expect(nextQuoteAt(at("2026-10-30T07:00:00Z")).toISOString()).toBe("2026-11-02T01:30:00.000Z");
    expect(nextQuoteAt(at("2026-10-28T02:32:00Z"), true).toISOString()).toBe("2026-10-29T01:30:00.000Z");
  });

  it("pauses when the index time is missing and volume does not change", () => {
    expect(
      tradeGate({
        now: at("2026-10-28T02:32:00Z"),
        indexDate: null,
        volumeUnchanged: true,
        quotesStale: false,
      }).label,
    ).toBe("成交量未变，暂停下单");
  });
});
