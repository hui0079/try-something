import { describe, expect, it } from "vitest";

import {
  INITIAL_CASH,
  applyOrders,
  feesFor,
  limitPrices,
  maxBuyLots,
  rollSession,
  type BookState,
  type Quote,
} from "@/lib/broker/apply";

const quote = (patch: Partial<Quote> = {}): Quote => ({
  code: "600519",
  name: "贵州茅台",
  price: 100,
  prevClose: 100,
  open: 100,
  high: 100,
  low: 100,
  volume: 1000,
  amount: 100000,
  changePct: 0,
  ...patch,
});

const book = (patch: Partial<BookState> = {}): BookState => ({
  cash: INITIAL_CASH,
  positions: [],
  watchlist: ["600519", "300750"],
  ...patch,
});

describe("limitPrices", () => {
  it("rounds the main-board band to the nearest fen", () => {
    expect(limitPrices("600519", "贵州茅台", 10.05)).toEqual({
      up: 11.06,
      down: 9.05,
    });
  });

  it("uses 20% for ChiNext and STAR", () => {
    const chiNext = limitPrices("300750", "宁德时代", 100);
    const star = limitPrices("688981", "中芯国际", 100);
    if ("error" in chiNext || "error" in star) throw new Error("expected a price band");
    expect(chiNext.up).toBe(120);
    expect(star.down).toBe(80);
  });

  it("rejects ST names and unknown boards", () => {
    expect(limitPrices("600000", "ST浦发", 10)).toEqual({
      error: "ST 标的不交易",
    });
    expect(limitPrices("830001", "北交所", 10)).toEqual({
      error: "不支持的代码",
    });
  });
});

describe("feesFor", () => {
  it("charges the 5 yuan commission floor, transfer fee, and sell-side stamp tax", () => {
    expect(feesFor("buy", 1000)).toEqual({ commission: 5, stamp: 0, transfer: 0.01, total: 5.01 });
    expect(feesFor("sell", 1000)).toEqual({
      commission: 5,
      stamp: 0.5,
      transfer: 0.01,
      total: 5.51,
    });
  });
});

describe("applyOrders", () => {
  it("buys a supported code that is not on the watchlist", () => {
    const result = applyOrders(
      book({ watchlist: ["600519"] }),
      [{ code: "600036", side: "buy", lots: 1, reason: "榜单" }],
      [quote({ code: "600036", name: "招商银行", price: 40, prevClose: 40, open: 40, high: 40, low: 40 })],
    );
    expect(result.fills).toHaveLength(1);
    expect(result.rejects).toEqual([]);
  });

  it("buys a whole lot, locks the shares for T+1, and keeps fees in the cost", () => {
    const result = applyOrders(
      book(),
      [{ code: "600519", side: "buy", lots: 1, reason: "试买" }],
      [quote({ price: 10, prevClose: 10, open: 10, high: 10, low: 10 })],
    );

    expect(result.rejects).toEqual([]);
    expect(result.fills).toHaveLength(1);
    expect(result.fills[0]).toMatchObject({ qty: 100, price: 10, fee: 5.01 });
    expect(result.state.positions).toEqual([
      {
        code: "600519",
        name: "贵州茅台",
        qty: 100,
        availableQty: 0,
        avgCost: 10.0501,
      },
    ]);
    expect(result.state.cash).toBeCloseTo(INITIAL_CASH - 1000 - 5.01, 2);
  });

  it("sells yesterday's shares before buys and realizes pnl after sell fees", () => {
    const start = book({
      cash: 10_000,
      positions: [
        {
          code: "600519",
          name: "贵州茅台",
          qty: 100,
          availableQty: 100,
          avgCost: 10,
        },
      ],
    });
    const result = applyOrders(
      start,
      [
        { code: "600519", side: "buy", lots: 1, reason: "先写的买单" },
        { code: "600519", side: "sell", lots: 1, reason: "先卖" },
      ],
      [quote({ price: 12, prevClose: 12 })],
    );

    expect(result.fills.map((fill) => fill.side)).toEqual(["sell", "buy"]);
    expect(result.fills[0].realizedPnl).toBeCloseTo(1200 - 5.61 - 1000, 2);
    expect(result.state.positions[0].availableQty).toBe(0);
    expect(result.state.positions[0].qty).toBe(100);
  });

  it("rejects limit-up buys, limit-down sells, odd lots, missing cash, and oversized positions", () => {
    const rich = book();
    const atLimitUp = applyOrders(
      rich,
      [{ code: "600519", side: "buy", lots: 1, reason: "涨停" }],
      [quote({ price: 110, prevClose: 100 })],
    );
    expect(atLimitUp.rejects[0].reason).toBe("涨停不买");

    const held = book({
      positions: [
        { code: "600519", name: "贵州茅台", qty: 100, availableQty: 100, avgCost: 100 },
      ],
    });
    const atLimitDown = applyOrders(
      held,
      [{ code: "600519", side: "sell", lots: 1, reason: "跌停" }],
      [quote({ price: 90, prevClose: 100 })],
    );
    expect(atLimitDown.rejects[0].reason).toBe("跌停不卖");

    const odd = applyOrders(
      rich,
      [{ code: "600519", side: "buy", lots: 1.5, reason: "零股" }],
      [quote()],
    );
    expect(odd.rejects[0].reason).toBe("手数不合法");

    const poor = applyOrders(
      book({ cash: 100 }),
      [{ code: "600519", side: "buy", lots: 1, reason: "没钱" }],
      [quote()],
    );
    expect(poor.rejects[0].reason).toBe("资金不足");
    expect(poor.state.cash).toBe(100);

    const capped = applyOrders(
      book({ cash: 1_000_000 }),
      [{ code: "600519", side: "buy", lots: 40, reason: "过重" }],
      [quote({ price: 100 })],
    );
    expect(capped.rejects[0].reason).toBe("超过单票仓位上限");
    expect(capped.state.positions).toEqual([]);
  });

  it("rejects sells that exceed shares available today", () => {
    const result = applyOrders(
      book({
        positions: [
          { code: "600519", name: "贵州茅台", qty: 100, availableQty: 0, avgCost: 100 },
        ],
      }),
      [{ code: "600519", side: "sell", lots: 1, reason: "当天买的" }],
      [quote()],
    );
    expect(result.rejects[0].reason).toBe("可卖数量不足");
  });
});

describe("rollSession", () => {
  it("makes today's buys sellable on the next session", () => {
    const rolled = rollSession(
      book({
        positions: [
          { code: "600519", name: "贵州茅台", qty: 300, availableQty: 100, avgCost: 10 },
        ],
      }),
    );
    expect(rolled.positions[0].availableQty).toBe(300);
  });
});

describe("maxBuyLots", () => {
  it("is limited by the 30% position cap", () => {
    expect(maxBuyLots(book(), quote({ price: 100 }))).toBe(29);
  });
});
