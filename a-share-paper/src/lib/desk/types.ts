import type { BoardTag } from "@/lib/market/board";

export type DeskMemory = {
  quotes: {
    code: string;
    name: string;
    price: number;
    prevClose: number;
    open: number;
    high: number;
    low: number;
    volume: number;
    amount: number;
    changePct: number;
  }[];
  quoteError: string | null;
  stale: boolean;
  lastGoodAt: number | null;
  nextFetchAt: number | null;
  quoteFailures: number;
  quoteSource: number;
  volumeFrozen: boolean;
  volumes: Record<string, number> | null;
  indexDate: string | null;
  candidates: {
    code: string;
    name: string;
    price: number;
    prevClose: number;
    open: number;
    high: number;
    low: number;
    volume: number;
    amount: number;
    changePct: number;
    tag: BoardTag;
  }[];
  closedDate: string | null;
  sessionLabel: string;
  inFlight: boolean;
  lastStartedAt: number | null;
  lastRunId: string | null;
  lastDurationMs: number | null;
  lastMessage: string | null;
};

export type DeskView = {
  sessionLabel: string;
  sessionOpen: boolean;
  quoteError: string | null;
  quotesStale: boolean;
  apiKeyConfigured: boolean;
  decision: {
    inFlight: boolean;
    nextStartAt: string | null;
    lastDurationMs: number | null;
    lastRunId: string | null;
    lastMessage: string | null;
  };
  activeBookId: number;
  viewingBookId: number;
  readOnly: boolean;
  books: { id: number; createdAt: string; closedAt: string | null }[];
  cash: number;
  equity: number;
  marketValue: number;
  initialCash: number;
  todayPnl: number;
  todayStocks: { code: string; name: string; pnl: number }[];
  totalPnl: number;
  totalReturn: number;
  watchlist: string[];
  quotes: { code: string; name: string; price: number; changePct: number; prevClose: number }[];
  positions: {
    code: string;
    name: string;
    qty: number;
    availableQty: number;
    avgCost: number;
    price: number;
    marketValue: number;
    pnl: number;
  }[];
  curve: { label: string; equity: number }[];
  daily: { date: string; startEquity: number; endEquity: number; pnl: number; returnPct: number }[];
  trades: {
    id: number;
    ts: string;
    code: string;
    name: string;
    side: string;
    qty: number;
    price: number;
    fee: number;
    realizedPnl: number;
    reason: string;
  }[];
  decisions: { id: number; ts: string; summary: string; status: string; logic: string }[];
};
