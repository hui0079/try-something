import type { Quote } from "@/lib/broker/apply";

import { numberOrZero, QUOTE_UA, readGbk, toExchangeSymbol } from "@/lib/market/quote-http";

export function parseTencentQuotes(text: string): { quotes: Quote[]; indexDate: string | null } {
  const quotes: Quote[] = [];
  let indexDate: string | null = null;
  for (const matched of text.matchAll(/v_([a-z]{2})(\d+)="([^"]*)"/g)) {
    const market = matched[1];
    const fields = matched[3].split("~");
    const code = fields[2] || matched[2];
    if (!fields[1]) continue;
    if (market === "sh" && code === "000001") {
      indexDate = compactDate(fields[30]);
      continue;
    }
    const amountPart = fields[35]?.split("/")[2];
    quotes.push({
      code,
      name: fields[1],
      price: numberOrZero(fields[3]),
      prevClose: numberOrZero(fields[4]),
      open: numberOrZero(fields[5]),
      high: numberOrZero(fields[33]),
      low: numberOrZero(fields[34]),
      volume: numberOrZero(fields[6]),
      amount: numberOrZero(amountPart),
      changePct: numberOrZero(fields[32]),
    });
  }
  return { quotes, indexDate };
}

export async function fetchTencentQuotes(
  codes: string[],
  fetchImpl: typeof fetch = fetch,
): Promise<{ quotes: Quote[]; indexDate: string | null }> {
  const list = [...codes.map(toExchangeSymbol), "sh000001"].join(",");
  const response = await fetchImpl(`https://qt.gtimg.cn/q=${list}`, {
    headers: { Referer: "https://gu.qq.com", "User-Agent": QUOTE_UA },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`腾讯行情请求失败 ${response.status}`);
  const parsed = parseTencentQuotes(await readGbk(response));
  if (parsed.quotes.length === 0) throw new Error("腾讯行情为空");
  return parsed;
}

function compactDate(value: string | undefined): string | null {
  if (!value || value.length < 8) return null;
  const digits = value.slice(0, 8);
  if (!/^\d{8}$/.test(digits)) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}
