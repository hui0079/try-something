import { describe, expect, it } from "vitest";

import { INITIAL_CASH, type Quote } from "@/lib/broker/apply";
import { completeDecision, freshMemory, refreshDesk } from "@/lib/desk/cycle";
import { PaperStore } from "@/lib/db/store";
import { nextQuoteGapMs, QUOTE_HOLD_MS } from "@/lib/market/pace";

const quote: Quote = {
  code: "600519",
  name: "贵州茅台",
  price: 10,
  prevClose: 10,
  open: 10,
  high: 10,
  low: 10,
  volume: 10,
  amount: 100,
  changePct: 0,
};

describe("desk cycle", () => {
  it("does not ask for a decision while the market is closed", async () => {
    const store = PaperStore.memory();
    let called = false;
    const result = await refreshDesk({
      store,
      memory: freshMemory(),
      now: new Date("2026-10-31T02:32:00Z"),
      hasApiKey: true,
      fetchQuotes: async () => {
        called = true;
        return { quotes: [quote], indexDate: "2026-10-31" };
      },
    });
    expect(called).toBe(false);
    expect(result.action).toBe("wait");
    expect(result.snapshot).toBeNull();
    expect(result.memory.nextFetchAt).toBe(new Date("2026-11-02T01:30:00.000Z").getTime());
  });

  it("does not request quotes during the lunch break", async () => {
    const store = PaperStore.memory();
    const now = new Date("2026-10-28T04:00:00Z");
    let calls = 0;
    const result = await refreshDesk({
      store,
      memory: freshMemory(),
      now,
      hasApiKey: true,
      fetchQuotes: async () => {
        calls += 1;
        return { quotes: [quote], indexDate: "2026-10-28" };
      },
    });
    expect(calls).toBe(0);
    expect(result.memory.nextFetchAt).toBe(new Date("2026-10-28T05:00:00.000Z").getTime());
    expect(result.memory.sessionLabel).toBe("休市");
  });

  it("checks a holiday once and then waits until the next morning", async () => {
    const store = PaperStore.memory();
    const now = new Date("2026-10-28T02:32:00Z");
    let calls = 0;
    const fetchQuotes = async () => {
      calls += 1;
      return { quotes: [quote], indexDate: "2026-10-27" };
    };
    const first = await refreshDesk({
      store,
      memory: freshMemory(),
      now,
      hasApiKey: true,
      fetchQuotes,
    });
    expect(calls).toBe(1);
    expect(first.memory.closedDate).toBe("2026-10-28");
    expect(first.action).toBe("wait");
    const second = await refreshDesk({
      store,
      memory: first.memory,
      now: new Date(now.getTime() + 30_000),
      hasApiKey: true,
      fetchQuotes,
    });
    expect(calls).toBe(1);
    expect(second.memory.nextFetchAt).toBe(new Date("2026-10-29T01:30:00.000Z").getTime());
  });

  it("keeps an in-flight decision through a short quote outage", async () => {
    const store = PaperStore.memory();
    const now = new Date("2026-10-28T02:32:00Z");
    const result = await refreshDesk({
      store,
      memory: {
        ...freshMemory(),
        inFlight: true,
        quotes: [quote],
        lastGoodAt: now.getTime() - 10_000,
        sessionLabel: "连续竞价",
      },
      now,
      hasApiKey: true,
      fetchQuotes: async () => {
        throw new Error("fetch failed");
      },
    });
    expect(result.action).toBe("wait");
    expect(result.memory.quotes).toEqual([quote]);
  });

  it("drops an in-flight decision after quotes stay down", async () => {
    const store = PaperStore.memory();
    const now = new Date("2026-10-28T02:32:00Z");
    const result = await refreshDesk({
      store,
      memory: {
        ...freshMemory(),
        inFlight: true,
        quotes: [quote],
        lastGoodAt: now.getTime() - QUOTE_HOLD_MS - 1_000,
        sessionLabel: "连续竞价",
      },
      now,
      hasApiKey: true,
      fetchQuotes: async () => {
        throw new Error("fetch failed");
      },
    });
    expect(result.action).toBe("cancel");
  });

  it("does not hit the quote server again before the gap", async () => {
    const store = PaperStore.memory();
    const now = new Date("2026-10-28T02:32:00Z");
    let calls = 0;
    const result = await refreshDesk({
      store,
      memory: {
        ...freshMemory(),
        quotes: [quote],
        indexDate: "2026-10-28",
        lastGoodAt: now.getTime(),
        nextFetchAt: now.getTime() + 20_000,
        lastStartedAt: now.getTime(),
        sessionLabel: "连续竞价",
      },
      now,
      hasApiKey: true,
      fetchQuotes: async () => {
        calls += 1;
        return { quotes: [quote], indexDate: "2026-10-28" };
      },
    });
    expect(calls).toBe(0);
    expect(result.memory.nextFetchAt).toBe(now.getTime() + 20_000);
    expect(result.memory.sessionLabel).toBe("连续竞价");
  });

  it("waits longer after a quote request fails", async () => {
    const store = PaperStore.memory();
    const now = new Date("2026-10-28T02:32:00Z");
    const result = await refreshDesk({
      store,
      memory: {
        ...freshMemory(),
        quotes: [quote],
        indexDate: "2026-10-28",
        lastGoodAt: now.getTime(),
        lastStartedAt: now.getTime(),
        sessionLabel: "连续竞价",
      },
      now,
      hasApiKey: true,
      fetchQuotes: async () => {
        throw new Error("fetch failed");
      },
    });
    expect(result.action).toBe("wait");
    expect(result.memory.quoteFailures).toBe(1);
    expect(result.memory.nextFetchAt).toBe(now.getTime() + nextQuoteGapMs(1));
    expect(result.memory.quotes).toEqual([quote]);
  });

  it("drops a tool-using result and keeps the cash", () => {
    const store = PaperStore.memory();
    const book = store.ensureOpen("2026-10-28T02:00:00.000Z");
    completeDecision({
      store,
      bookId: book.id,
      quotes: [quote],
      nowIso: "2026-10-28T02:40:00.000Z",
      result: { ok: false, error: "tool", message: "助手调用了工具，本轮作废" },
    });
    expect(store.getBook(book.id).cash).toBe(INITIAL_CASH);
    expect(store.positions(book.id)).toEqual([]);
    expect(store.decisions(book.id)[0].status).toBe("tool");
  });

  it("applies a buy decision", () => {
    const store = PaperStore.memory();
    const book = store.ensureOpen("2026-10-28T02:00:00.000Z");
    completeDecision({
      store,
      bookId: book.id,
      quotes: [quote],
      nowIso: "2026-10-28T02:40:00.000Z",
      result: {
        ok: true,
        text: JSON.stringify({
          summary: "买一手",
          logic: "自选里的茅台",
          actions: [{ code: "600519", side: "buy", lots: 1, reason: "试仓" }],
        }),
      },
    });
    expect(store.positions(book.id)[0]).toMatchObject({ qty: 100, availableQty: 0 });
    expect(store.trades(book.id)).toHaveLength(1);
    expect(store.decisions(book.id)[0].status).toBe("filled");
  });
});
