import { describe, expect, it } from "vitest";

import { todayByStock } from "@/lib/desk/today";

const date = "2026-10-28";
const today = "2026-10-28T02:00:00.000Z";
const yesterday = "2026-10-27T02:00:00.000Z";

describe("todayByStock", () => {
  it("marks an overnight holding against yesterday's close", () => {
    expect(
      todayByStock({
        date,
        positions: [{ code: "600519", name: "贵州茅台", qty: 100 }],
        trades: [],
        quotes: [{ code: "600519", name: "贵州茅台", price: 11, prevClose: 10 }],
      }),
    ).toEqual([{ code: "600519", name: "贵州茅台", pnl: 100 }]);
  });

  it("counts a same-day buy from the fill price, including the fee", () => {
    expect(
      todayByStock({
        date,
        positions: [{ code: "600036", name: "招商银行", qty: 100 }],
        trades: [{ ts: today, code: "600036", name: "招商银行", side: "buy", qty: 100, price: 10.5, fee: 5 }],
        quotes: [{ code: "600036", name: "招商银行", price: 11, prevClose: 10 }],
      }),
    ).toEqual([{ code: "600036", name: "招商银行", pnl: 45 }]);
  });

  it("keeps a stock that was sold out today", () => {
    expect(
      todayByStock({
        date,
        positions: [],
        trades: [
          { ts: yesterday, code: "601318", name: "中国平安", side: "buy", qty: 100, price: 8, fee: 5 },
          { ts: today, code: "601318", name: "中国平安", side: "sell", qty: 100, price: 12, fee: 5 },
        ],
        quotes: [{ code: "601318", name: "中国平安", price: 12, prevClose: 10 }],
      }),
    ).toEqual([{ code: "601318", name: "中国平安", pnl: 195 }]);
  });

  it("splits an overnight hold from shares bought today", () => {
    const rows = todayByStock({
      date,
      positions: [{ code: "600519", name: "贵州茅台", qty: 200 }],
      trades: [{ ts: today, code: "600519", name: "贵州茅台", side: "buy", qty: 100, price: 9, fee: 5 }],
      quotes: [{ code: "600519", name: "贵州茅台", price: 11, prevClose: 10 }],
    });
    expect(rows).toEqual([{ code: "600519", name: "贵州茅台", pnl: 295 }]);
  });
});
