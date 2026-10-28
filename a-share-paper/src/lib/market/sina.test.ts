import { describe, expect, it } from "vitest";

import { parseSinaQuotes } from "@/lib/market/sina";

const text = [
  'var hq_str_sh600519="贵州茅台,1354.980,1355.900,1331.450,1354.980,1330.170,1331.160,1332.200,2201241,2951089551.000,100,1331.160,2026-10-28,11:30:00,00,";',
  'var hq_str_sz000001="平安银行,10,11,10.5,11,10,0,0,100000,1000,0,0,2026-10-28,11:30:00,00,";',
  'var hq_str_sh000001="上证指数,3676.9185,3648.3010,3674.4434,3684.4906,3652.3658,0,0,266921490,463110532798,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2026-10-28,11:36:03,00,";',
].join("\n");

describe("sina quotes", () => {
  it("reads stocks in lots and takes the index date from the Shanghai index", () => {
    const parsed = parseSinaQuotes(text);
    expect(parsed.indexDate).toBe("2026-10-28");
    expect(parsed.quotes.map((quote) => quote.code)).toEqual(["600519", "000001"]);
    expect(parsed.quotes[0]).toMatchObject({
      name: "贵州茅台",
      price: 1331.45,
      prevClose: 1355.9,
      open: 1354.98,
      high: 1354.98,
      low: 1330.17,
      volume: 22012,
      amount: 2951089551,
    });
    expect(parsed.quotes[0]?.changePct).toBeCloseTo(-1.803, 2);
    expect(parsed.quotes[1]).toMatchObject({ name: "平安银行", volume: 1000 });
  });
});
