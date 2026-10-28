import { describe, expect, it } from "vitest";

import { parseEastMoneyBoard, parseSinaBoard } from "@/lib/market/board";

describe("market board", () => {
  it("keeps the first tag when a name appears on more than one list", () => {
    const amount = parseSinaBoard(
      [{ code: "300308", name: "中际旭创", trade: "623.87", settlement: "577", open: "599", high: "628", low: "588", volume: 26708162, amount: 16224816535, changepercent: 8.123 }],
      "成交额",
    );
    const gainers = parseSinaBoard(
      [
        { code: "300308", name: "中际旭创", trade: "623.87", settlement: "577", open: "599", high: "628", low: "588", volume: 100, amount: 100, changepercent: 8.123 },
        { code: "600000", name: "*ST示例", trade: "5", settlement: "4", open: "4", high: "5", low: "4", volume: 100, amount: 100, changepercent: 9 },
      ],
      "涨幅",
    );
    expect(gainers.map((candidate) => candidate.code)).toEqual(["300308"]);
    expect(amount[0]).toMatchObject({ tag: "成交额", volume: 267082, amount: 16224816535 });
  });

  it("reads an East Money board row", () => {
    const parsed = parseEastMoneyBoard(
      { rc: 0, data: { diff: [{ f12: "600519", f14: "贵州茅台", f2: 1326, f3: -2.1, f6: 5_000_000_000, f15: 1350, f16: 1320, f17: 1340, f18: 1355 }] } },
      "成交额",
    );
    expect(parsed[0]).toMatchObject({ code: "600519", name: "贵州茅台", price: 1326, changePct: -2.1, tag: "成交额" });
  });
});
