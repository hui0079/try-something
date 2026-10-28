import type { Quote } from "@/lib/broker/apply";

import { fetchEastMoneyQuotes } from "@/lib/market/eastmoney";
import { fetchSinaQuotes } from "@/lib/market/sina";
import { fetchTencentQuotes } from "@/lib/market/tencent";

export type QuoteBook = {
  quotes: Quote[];
  indexDate: string | null;
  source: number;
};

const SOURCES = [fetchEastMoneyQuotes, fetchSinaQuotes, fetchTencentQuotes] as const;

export async function fetchMarketQuotes(
  codes: string[],
  fetchImpl: typeof fetch = fetch,
  attempt = 0,
  startAt = 0,
): Promise<QuoteBook> {
  let lastError: unknown = new Error("行情请求失败");
  for (let step = 0; step < SOURCES.length; step += 1) {
    const source = (startAt + step) % SOURCES.length;
    try {
      const loaded =
        source === 0
          ? await fetchEastMoneyQuotes(codes, fetchImpl, attempt)
          : await SOURCES[source](codes, fetchImpl);
      if (loaded.quotes.length === 0) throw new Error("行情为空");
      return { ...loaded, source };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("行情请求失败");
}
