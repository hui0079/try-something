import { describe, expect, it } from "vitest";

import { fetchMarketQuotes } from "@/lib/market/quotes";

const eastMoney = {
  rc: 0,
  data: {
    diff: [
      { f12: "600519", f14: "贵州茅台", f2: 10, f3: 1, f5: 100, f6: 200, f15: 11, f16: 9, f17: 10, f18: 10 },
      { f12: "000001", f14: "上证指数", f2: 3000, f86: "20261028" },
    ],
  },
};

const sina = 'var hq_str_sh600519="MOUTAI,10,10,11,11,9,0,0,10000,2000,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2026-10-28,11:30:00,00,";\nvar hq_str_sh000001="INDEX,1,1,1,1,1,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2026-10-28,11:30:00,00,";';

function responseFor(url: string): Response {
  const target = String(url);
  if (target.includes("eastmoney")) return new Response(JSON.stringify(eastMoney), { status: 200 });
  if (target.includes("sinajs")) return new Response(sina, { status: 200 });
  return new Response('v_sh600519="1~TENCENT~600519~12~10~10~80~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~~20261028113000~2~20~12~9~12/80/3000";\nv_sh000001="1~INDEX~000001~1~1~1~1~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~~20261028113000~0~0~1~1~1/1/1";', {
    status: 200,
  });
}

describe("quote sources", () => {
  it("stays on East Money when that source responds", async () => {
    const urls: string[] = [];
    const result = await fetchMarketQuotes(["600519"], async (url) => {
      urls.push(String(url));
      return responseFor(String(url));
    });
    expect(result.source).toBe(0);
    expect(result.quotes[0]?.name).toBe("贵州茅台");
    expect(urls.some((url) => url.includes("sinajs"))).toBe(false);
  });

  it("uses Sina when East Money fails and keeps that source next time", async () => {
    const urls: string[] = [];
    const fetchImpl: typeof fetch = async (url) => {
      urls.push(String(url));
      if (String(url).includes("eastmoney")) throw new Error("fetch failed");
      return responseFor(String(url));
    };
    const first = await fetchMarketQuotes(["600519"], fetchImpl, 0, 0);
    expect(first.source).toBe(1);
    expect(first.quotes[0]).toMatchObject({ code: "600519", price: 11, volume: 100 });
    expect(first.indexDate).toBe("2026-10-28");

    urls.length = 0;
    const second = await fetchMarketQuotes(["600519"], fetchImpl, 0, first.source);
    expect(second.source).toBe(1);
    expect(urls.some((url) => url.includes("eastmoney"))).toBe(false);
  });

  it("uses Tencent when East Money and Sina both fail", async () => {
    const result = await fetchMarketQuotes(["600519"], async (url) => {
      if (!String(url).includes("gtimg")) throw new Error("fetch failed");
      return responseFor(String(url));
    });
    expect(result.source).toBe(2);
    expect(result.quotes[0]).toMatchObject({ name: "TENCENT", price: 12, amount: 3000 });
  });
});
