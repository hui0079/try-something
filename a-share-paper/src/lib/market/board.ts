import type { Quote } from "@/lib/broker/apply";
import { QUOTE_UA } from "@/lib/market/quote-http";
import { isSupportedCode } from "@/lib/market/watchlist";

export type BoardTag = "成交额" | "涨幅" | "跌幅";

export type Candidate = Quote & {
  tag: BoardTag;
};

const BOARD_HOST = "https://82.push2.eastmoney.com/api/qt/clist/get";
const MARKET = "m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23";
const SINA_BOARD =
  "https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData";

export async function fetchBoard(fetchImpl: typeof fetch = fetch): Promise<Candidate[]> {
  try {
    return await fetchEastMoneyBoard(fetchImpl);
  } catch {
    return fetchSinaBoard(fetchImpl);
  }
}

export function parseEastMoneyBoard(body: unknown, tag: BoardTag): Candidate[] {
  const diff = (body as { data?: { diff?: unknown[] } })?.data?.diff;
  if (!Array.isArray(diff)) return [];
  return diff.flatMap((row) => fromEastMoney(row, tag));
}

export function parseSinaBoard(body: unknown, tag: BoardTag): Candidate[] {
  if (!Array.isArray(body)) return [];
  return body.flatMap((row) => fromSina(row, tag));
}

export async function fetchEastMoneyBoard(fetchImpl: typeof fetch): Promise<Candidate[]> {
  const [amount, gainers, losers] = await Promise.all([
    eastList(fetchImpl, "f6", 1, 15),
    eastList(fetchImpl, "f3", 1, 10),
    eastList(fetchImpl, "f3", 0, 10),
  ]);
  return mergeCandidates([
    ...parseEastMoneyBoard(amount, "成交额"),
    ...parseEastMoneyBoard(gainers, "涨幅"),
    ...parseEastMoneyBoard(losers, "跌幅"),
  ]);
}

export async function fetchSinaBoard(fetchImpl: typeof fetch): Promise<Candidate[]> {
  const [amount, gainers, losers] = await Promise.all([
    sinaList(fetchImpl, "amount", 0, 15),
    sinaList(fetchImpl, "changepercent", 0, 10),
    sinaList(fetchImpl, "changepercent", 1, 10),
  ]);
  return mergeCandidates([
    ...parseSinaBoard(amount, "成交额"),
    ...parseSinaBoard(gainers, "涨幅"),
    ...parseSinaBoard(losers, "跌幅"),
  ]);
}

function mergeCandidates(candidates: Candidate[]): Candidate[] {
  const seen = new Set<string>();
  const merged: Candidate[] = [];
  for (const candidate of candidates) {
    if (seen.has(candidate.code)) continue;
    seen.add(candidate.code);
    merged.push(candidate);
  }
  return merged;
}

async function eastList(fetchImpl: typeof fetch, sort: string, descending: number, size: number): Promise<unknown> {
  const url = `${BOARD_HOST}?pn=1&pz=${size}&po=${descending}&np=1&fltt=2&invt=2&fid=${sort}&fs=${encodeURIComponent(MARKET)}&fields=f2,f3,f6,f12,f14,f15,f16,f17,f18`;
  const response = await fetchImpl(url, {
    headers: { Referer: "https://quote.eastmoney.com/", "User-Agent": QUOTE_UA },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`榜单请求失败 ${response.status}`);
  const body: unknown = await response.json();
  if ((body as { rc?: number }).rc !== 0) throw new Error("榜单接口返回失败");
  return body;
}

async function sinaList(fetchImpl: typeof fetch, sort: string, ascending: number, size: number): Promise<unknown> {
  const url = `${SINA_BOARD}?page=1&num=${size}&sort=${sort}&asc=${ascending}&node=hs_a`;
  const response = await fetchImpl(url, {
    headers: { Referer: "https://finance.sina.com.cn", "User-Agent": QUOTE_UA },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`新浪榜单请求失败 ${response.status}`);
  return response.json();
}

function fromEastMoney(row: unknown, tag: BoardTag): Candidate[] {
  const record = row as Record<string, unknown>;
  return toCandidate(
    {
      code: text(record.f12),
      name: text(record.f14),
      price: num(record.f2),
      prevClose: num(record.f18),
      open: num(record.f17),
      high: num(record.f15),
      low: num(record.f16),
      volume: 0,
      amount: num(record.f6),
      changePct: num(record.f3),
    },
    tag,
  );
}

function fromSina(row: unknown, tag: BoardTag): Candidate[] {
  const record = row as Record<string, unknown>;
  return toCandidate(
    {
      code: text(record.code),
      name: text(record.name),
      price: num(record.trade),
      prevClose: num(record.settlement),
      open: num(record.open),
      high: num(record.high),
      low: num(record.low),
      volume: Math.round(num(record.volume) / 100),
      amount: num(record.amount),
      changePct: num(record.changepercent),
    },
    tag,
  );
}

function toCandidate(quote: Quote, tag: BoardTag): Candidate[] {
  if (!isSupportedCode(quote.code) || quote.price <= 0 || quote.prevClose <= 0) return [];
  if (quote.name.toUpperCase().includes("ST")) return [];
  return [{ ...quote, tag }];
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function num(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
