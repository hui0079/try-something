import { describe, expect, it } from "vitest";

import { fetchEastMoneyQuotes, parseIndexDate, parseQuotes, quoteHost, toSecId } from "@/lib/market/eastmoney";

const stamp = Date.parse("2026-10-28T02:00:00Z") / 1000;

const body = {
  rc: 0,
  data: {
    diff: [
      {
        f12: "600519",
        f14: "贵州茅台",
        f2: 1400.5,
        f3: 1.2,
        f5: 100,
        f6: 2000,
        f15: 1410,
        f16: 1390,
        f17: 1395,
        f18: 1384,
      },
      { f12: "000001", f14: "上证指数", f2: 3000, f86: stamp },
      { f12: "000858", f14: "五粮液", f2: "-", f18: 120 },
    ],
  },
};

describe("eastmoney quotes", () => {
  it("maps Shanghai codes and keeps a dash price as zero", () => {
    expect(toSecId("600519")).toBe("1.600519");
    expect(toSecId("000858")).toBe("0.000858");
    const quotes = parseQuotes(body);
    expect(quotes.map((quote) => quote.code)).toEqual(["600519", "000858"]);
    expect(quotes[0]).toMatchObject({ name: "贵州茅台", price: 1400.5, prevClose: 1384 });
    expect(quotes[1].price).toBe(0);
  });

  it("reads the index timestamp as a Shanghai date", () => {
    expect(parseIndexDate(body)).toBe("2026-10-28");
  });

  it("contacts one host per attempt and rotates after failures", async () => {
    let calls = 0;
    await expect(
      fetchEastMoneyQuotes(["600519"], async (url) => {
        calls += 1;
        expect(String(url).startsWith(quoteHost(0))).toBe(true);
        throw new Error("fetch failed");
      }, 0),
    ).rejects.toThrow("fetch failed");
    expect(calls).toBe(1);

    const result = await fetchEastMoneyQuotes(["600519"], async (url) => {
      expect(String(url).startsWith(quoteHost(1))).toBe(true);
      return new Response(JSON.stringify(body), { status: 200 });
    }, 1);
    expect(result.indexDate).toBe("2026-10-28");
    expect(result.quotes[0]?.code).toBe("600519");
  });
});
