import { describe, expect, it } from "vitest";

import { INITIAL_CASH } from "@/lib/broker/apply";
import { PaperStore } from "@/lib/db/store";

describe("PaperStore", () => {
  it("keeps one equity row per minute and writes the daily return from the first and last point", () => {
    const store = PaperStore.memory();
    const book = store.ensureOpen("2026-10-28T02:00:00.000Z");
    store.recordEquity(book.id, "2026-10-28T10:31", 1_000_000, 1_000_000, 0);
    store.recordEquity(book.id, "2026-10-28T10:31", 1_001_000, 1_000_000, 1_000);
    store.recordEquity(book.id, "2026-10-28T10:32", 1_002_000, 1_000_000, 2_000);
    expect(store.equityPoints(book.id)).toHaveLength(2);
    expect(store.equityPoints(book.id)[0].equity).toBe(1_001_000);

    store.finalizeDay(book.id, "2026-10-28");
    expect(store.dailyReturns(book.id)).toEqual([
      {
        date: "2026-10-28",
        startEquity: 1_001_000,
        endEquity: 1_002_000,
        pnl: 1000,
        returnPct: 1000 / 1_001_000,
      },
    ]);
  });

  it("archives the old book on reset and opens a new one at the initial cash", () => {
    const store = PaperStore.memory();
    const first = store.ensureOpen("2026-10-28T02:00:00.000Z");
    store.recordEquity(first.id, "2026-10-28T10:31", 900_000, 900_000, 0);
    const next = store.reset("2026-10-29T02:00:00.000Z");

    expect(next.id).not.toBe(first.id);
    expect(next.cash).toBe(INITIAL_CASH);
    expect(store.getBook(first.id).closedAt).toBe("2026-10-29T02:00:00.000Z");
    expect(store.equityPoints(first.id)).toHaveLength(1);
    expect(store.equityPoints(next.id)).toHaveLength(0);
  });
});
