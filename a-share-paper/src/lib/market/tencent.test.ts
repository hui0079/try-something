import { describe, expect, it } from "vitest";

import { parseTencentQuotes } from "@/lib/market/tencent";

const text = [
  'v_sh600519="1~贵州茅台~600519~1331.45~1355.90~1354.98~22012~9740~12272~1331.16~1~1331.10~1~1331.02~3~1331.01~1~1331.00~23~1332.20~2~1332.33~1~1332.65~1~1332.66~1~1332.88~2~~20261028113708~-24.45~-1.80~1354.98~1330.17~1331.45/22012/2951089551";',
  'v_sh000001="1~上证指数~000001~3674.44~3648.30~3676.92~266921490~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~~20261028113800~26.14~0.72~3684.49~3652.37~3674.44/266921490/463110532798";',
].join("\n");

describe("tencent quotes", () => {
  it("reads the stock quote and the index date", () => {
    const parsed = parseTencentQuotes(text);
    expect(parsed.indexDate).toBe("2026-10-28");
    expect(parsed.quotes).toEqual([
      expect.objectContaining({
        code: "600519",
        name: "贵州茅台",
        price: 1331.45,
        prevClose: 1355.9,
        open: 1354.98,
        high: 1354.98,
        low: 1330.17,
        volume: 22012,
        amount: 2951089551,
        changePct: -1.8,
      }),
    ]);
  });
});
