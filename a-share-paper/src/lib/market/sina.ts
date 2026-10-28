import type { Quote } from "@/lib/broker/apply";

import { numberOrZero, QUOTE_UA, readGbk, toExchangeSymbol } from "@/lib/market/quote-http";

export function parseSinaQuotes(text: string): { quotes: Quote[]; indexDate: string | null } {
  const quotes: Quote[] = [];
  let indexDate: string | null = null;
  for (const matched of text.matchAll(/hq_str_([a-z]{2})(\d+)="([^"]*)"/g)) {
    const market = matched[1];
    const code = matched[2];
    const fields = matched[3].split(",");
    if (!fields[0]) continue;
    if (market === "sh" && code === "000001") {
      indexDate = /^\d{4}-\d{2}-\d{2}$/.test(fields[30] ?? "") ? fields[30] : null;
      continue;
    }
    const price = numberOrZero(fields[3]);
    const prevClose = numberOrZero(fields[2]);
    quotes.push({
      code,
      name: fields[0],
      price,
      prevClose,
      open: numberOrZero(fields[1]),
      high: numberOrZero(fields[4]),
      low: numberOrZero(fields[5]),
      volume: Math.round(numberOrZero(fields[8]) / 100),
      amount: numberOrZero(fields[9]),
      changePct: prevClose === 0 ? 0 : ((price - prevClose) / prevClose) * 100,
    });
  }
  return { quotes, indexDate };
}

export async function fetchSinaQuotes(
  codes: string[],
  fetchImpl: typeof fetch = fetch,
): Promise<{ quotes: Quote[]; indexDate: string | null }> {
  const list = [...codes.map(toExchangeSymbol), "sh000001"].join(",");
  const response = await fetchImpl(`https://hq.sinajs.cn/list=${list}`, {
    headers: { Referer: "https://finance.sina.com.cn", "User-Agent": QUOTE_UA },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`新浪行情请求失败 ${response.status}`);
  const parsed = parseSinaQuotes(await readGbk(response));
  if (parsed.quotes.length === 0) throw new Error("新浪行情为空");
  return parsed;
}
