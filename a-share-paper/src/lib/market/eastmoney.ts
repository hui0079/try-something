import type { Quote } from "@/lib/broker/apply";
import { QUOTE_UA } from "@/lib/market/quote-http";
import { shanghaiClock } from "@/lib/time";

const QUOTE_HOSTS = [
  "https://82.push2.eastmoney.com/api/qt/ulist.np/get",
  "https://push2delay.eastmoney.com/api/qt/ulist.np/get",
  "https://push2.eastmoney.com/api/qt/ulist.np/get",
];
const FIELDS = "f2,f3,f5,f6,f12,f14,f15,f16,f17,f18,f86";

type QuoteRow = {
  f2?: number | string;
  f3?: number | string;
  f5?: number | string;
  f6?: number | string;
  f12?: string;
  f14?: string;
  f15?: number | string;
  f16?: number | string;
  f17?: number | string;
  f18?: number | string;
  f86?: number | string;
};

export function toSecId(code: string): string {
  return `${code.startsWith("6") || code.startsWith("9") ? "1" : "0"}.${code}`;
}

export function parseQuotes(body: unknown): Quote[] {
  return rows(body)
    .filter((row) => row.f12 && row.f12 !== "000001")
    .map((row) => ({
      code: String(row.f12),
      name: String(row.f14 ?? row.f12),
      price: numberOrZero(row.f2),
      prevClose: numberOrZero(row.f18),
      open: numberOrZero(row.f17),
      high: numberOrZero(row.f15),
      low: numberOrZero(row.f16),
      volume: numberOrZero(row.f5),
      amount: numberOrZero(row.f6),
      changePct: numberOrZero(row.f3),
    }));
}

export function parseIndexDate(body: unknown): string | null {
  const index = rows(body).find((row) => row.f12 === "000001");
  return index ? timestampToShanghaiDate(index.f86) : null;
}

export function quoteHost(attempt: number): string {
  const index = ((attempt % QUOTE_HOSTS.length) + QUOTE_HOSTS.length) % QUOTE_HOSTS.length;
  return QUOTE_HOSTS[index];
}

export async function fetchEastMoneyQuotes(
  codes: string[],
  fetchImpl: typeof fetch = fetch,
  attempt = 0,
): Promise<{ quotes: Quote[]; indexDate: string | null }> {
  const secids = [...codes.map(toSecId), "1.000001"].join(",");
  const response = await fetchImpl(`${quoteHost(attempt)}?fltt=2&fields=${FIELDS}&secids=${secids}`, {
    headers: {
      Referer: "https://quote.eastmoney.com/",
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "zh-CN,zh;q=0.9",
      "User-Agent": QUOTE_UA,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`行情请求失败 ${response.status}`);
  const body: unknown = await response.json();
  const record = body as { rc?: number };
  if (record.rc !== 0) throw new Error("行情接口返回失败");
  return { quotes: parseQuotes(body), indexDate: parseIndexDate(body) };
}

function rows(body: unknown): QuoteRow[] {
  const diff = (body as { data?: { diff?: QuoteRow[] } })?.data?.diff;
  return Array.isArray(diff) ? diff : [];
}

function numberOrZero(value: number | string | undefined): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function timestampToShanghaiDate(value: number | string | undefined): string | null {
  if (typeof value === "string" && /^\d{8}/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric < 1_000_000_000) return null;
  const millis = numeric > 10_000_000_000 ? numeric : numeric * 1000;
  return shanghaiClock(new Date(millis)).date;
}
