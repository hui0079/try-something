import { applyOrders, equityOf, marketValue, rollSession, type Quote } from "@/lib/broker/apply";
import { parseDecision } from "@/lib/ai/parse";
import { buildSnapshot, type DecisionSnapshot } from "@/lib/ai/snapshot";
import type { PaperStore } from "@/lib/db/store";
import { planDecision } from "@/lib/desk/plan";
import { todayByStock } from "@/lib/desk/today";
import { fetchBoard, type Candidate } from "@/lib/market/board";
import { fetchMarketQuotes } from "@/lib/market/quotes";
import { nextQuoteGapMs, QUOTE_HOLD_MS } from "@/lib/market/pace";
import { nextQuoteAt, quoteWindowOpen, sameVolumes, tradeGate } from "@/lib/market/session";
import { shanghaiClock } from "@/lib/time";
import type { DeskMemory, DeskView } from "@/lib/desk/types";

export type AgentRunResult =
  | { ok: true; text: string; runId?: string; durationMs?: number }
  | { ok: false; error: string; message: string; runId?: string; durationMs?: number };

export function freshMemory(): DeskMemory {
  return {
    quotes: [],
    quoteError: null,
    stale: false,
    lastGoodAt: null,
    nextFetchAt: null,
    quoteFailures: 0,
    quoteSource: 0,
    volumeFrozen: false,
    volumes: null,
    indexDate: null,
    candidates: [],
    closedDate: null,
    sessionLabel: "等待行情",
    inFlight: false,
    lastStartedAt: null,
    lastRunId: null,
    lastDurationMs: null,
    lastMessage: null,
  };
}

export async function refreshDesk(input: {
  store: PaperStore;
  memory: DeskMemory;
  now: Date;
  hasApiKey: boolean;
  fetchQuotes?: (codes: string[]) => Promise<{ quotes: Quote[]; indexDate: string | null; source?: number }>;
  fetchBoard?: () => Promise<Candidate[]>;
}): Promise<{ memory: DeskMemory; action: "start" | "wait" | "cancel"; snapshot: DecisionSnapshot | null }> {
  const book = input.store.ensureOpen(input.now.toISOString());
  const clock = shanghaiClock(input.now);
  const session = input.store.noteSession(book.id, clock.date);
  let positions = input.store.positions(book.id);
  const cash = input.store.getBook(book.id).cash;
  const watchlist = input.store.getBook(book.id).watchlist;
  if (session.rolled) {
    const rolled = rollSession({ cash, positions, watchlist });
    positions = rolled.positions;
    input.store.saveState(book.id, cash, positions, watchlist);
  }

  const memory: DeskMemory = { ...input.memory };
  const nowMs = input.now.getTime();
  const fetchQuotes =
    input.fetchQuotes ??
    ((codes: string[]) => fetchMarketQuotes(codes, fetch, memory.quoteFailures, memory.quoteSource));
  const clockOpen = quoteWindowOpen(input.now);
  const knownHoliday = memory.closedDate === clock.date;
  const due = clockOpen && !knownHoliday && (memory.nextFetchAt === null || nowMs >= memory.nextFetchAt);
  if (!clockOpen || knownHoliday) {
    memory.nextFetchAt = nextQuoteAt(input.now, knownHoliday).getTime();
    memory.quoteFailures = 0;
    memory.stale = false;
    memory.quoteError = null;
  }
  const tradedToday = input.store
    .trades(book.id)
    .filter((trade) => shanghaiClock(new Date(trade.ts)).date === clock.date)
    .map((trade) => trade.code);
  const quoteCodes = [
    ...new Set([...watchlist, ...positions.map((position) => position.code), ...tradedToday]),
  ];
  if (clockOpen && !knownHoliday && due && quoteCodes.length === 0) {
    memory.quotes = [];
    memory.quoteError = null;
    memory.stale = false;
    memory.lastGoodAt = nowMs;
    memory.quoteFailures = 0;
    memory.volumeFrozen = false;
    memory.volumes = {};
    memory.nextFetchAt = nowMs + nextQuoteGapMs(0);
  } else if (due) {
    try {
      const loaded = await fetchQuotes(quoteCodes);
      memory.quotes = loaded.quotes;
      memory.indexDate = loaded.indexDate;
      if (typeof loaded.source === "number") memory.quoteSource = loaded.source;
      memory.quoteError = null;
      memory.stale = false;
      memory.lastGoodAt = nowMs;
      memory.quoteFailures = 0;
      const volumes = Object.fromEntries(loaded.quotes.map((quote) => [quote.code, quote.volume]));
      memory.volumeFrozen = sameVolumes(memory.volumes, volumes);
      memory.volumes = volumes;
      if (loaded.indexDate && loaded.indexDate !== clock.date) memory.closedDate = clock.date;
    } catch (error) {
      memory.quoteFailures += 1;
      memory.stale = true;
      memory.quoteError = error instanceof Error ? error.message : "行情请求失败";
    }
    memory.nextFetchAt = nowMs + nextQuoteGapMs(memory.quoteFailures);
  }

  const age = memory.lastGoodAt === null ? Number.POSITIVE_INFINITY : nowMs - memory.lastGoodAt;
  const held =
    quoteCodes.length === 0 ||
    (memory.quotes.length > 0 && (age < QUOTE_HOLD_MS || !clockOpen || knownHoliday));
  const state = { cash, positions, watchlist };
  const value = marketValue(state, memory.quotes);
  const equity = equityOf(state, memory.quotes);
  input.store.recordEquity(book.id, clock.minute, equity, cash, value);
  const gate = tradeGate({
    now: input.now,
    indexDate: memory.indexDate,
    volumeUnchanged: memory.volumeFrozen,
    quotesStale: !held,
  });
  memory.sessionLabel = gate.label;
  const action = planDecision({
    sessionOpen: gate.open,
    quotesStale: !held,
    inFlight: memory.inFlight,
    hasApiKey: input.hasApiKey,
    nowMs,
    lastStartedAt: memory.lastStartedAt,
  });
  if (action === "start") {
    const loadBoard = input.fetchBoard ?? fetchBoard;
    try {
      memory.candidates = await loadBoard();
    } catch {
      memory.candidates = [];
    }
  }
  return {
    memory,
    action,
    snapshot:
      action === "start"
        ? buildSnapshot(state, equity, memory.quotes, input.store.decisions(book.id, 5), memory.candidates)
        : null,
  };
}

export function completeDecision(input: {
  store: PaperStore;
  bookId: number;
  result: AgentRunResult;
  quotes: Quote[];
  nowIso: string;
  tradableCodes?: string[];
}): void {
  const book = input.store.getBook(input.bookId);
  if (book.closedAt) return;
  if (!input.result.ok) {
    input.store.recordDecision(book.id, input.nowIso, input.result.message, input.result.error, input.result);
    return;
  }
  const parsed = parseDecision(input.result.text);
  if ("error" in parsed) {
    input.store.recordDecision(book.id, input.nowIso, parsed.error, "parse", { text: input.result.text });
    return;
  }
  const positions = input.store.positions(book.id);
  const limited = limitNewBuys(parsed.actions, positions, input.tradableCodes);
  const applied = applyOrders(
    { cash: book.cash, positions, watchlist: book.watchlist },
    limited.actions,
    input.quotes,
  );
  applied.rejects.push(...limited.rejects);
  input.store.saveState(book.id, applied.state.cash, applied.state.positions, book.watchlist);
  input.store.recordTrades(book.id, input.nowIso, applied.fills);
  const status = applied.fills.length > 0 ? "filled" : applied.rejects.length > 0 ? "rejected" : "noop";
  input.store.recordDecision(book.id, input.nowIso, parsed.summary, status, {
    logic: parsed.logic,
    fills: applied.fills,
    rejects: applied.rejects,
    runId: input.result.runId,
  });
}

const MAX_NEW_BUYS = 5;

function limitNewBuys(
  actions: { code: string; side: "buy" | "sell"; lots: number; reason: string }[],
  positions: { code: string; qty: number }[],
  tradableCodes: string[] | undefined,
): {
  actions: { code: string; side: "buy" | "sell"; lots: number; reason: string }[];
  rejects: { code: string; side: "buy" | "sell"; lots: number; reason: string }[];
} {
  const held = new Set(positions.filter((position) => position.qty > 0).map((position) => position.code));
  const allowed = tradableCodes ? new Set(tradableCodes) : null;
  const kept: typeof actions = [];
  const rejects: { code: string; side: "buy" | "sell"; lots: number; reason: string }[] = [];
  let opened = 0;
  for (const action of actions) {
    if (action.side === "buy" && !held.has(action.code)) {
      if (allowed && !allowed.has(action.code)) {
        rejects.push({ ...action, reason: "不在本轮候选" });
        continue;
      }
      opened += 1;
      if (opened > MAX_NEW_BUYS) {
        rejects.push({ ...action, reason: "超过本轮新开仓上限" });
        continue;
      }
    }
    kept.push(action);
  }
  return { actions: kept, rejects };
}

export function buildView(input: {
  store: PaperStore;
  memory: DeskMemory;
  now: Date;
  bookId?: number;
  hasApiKey: boolean;
}): DeskView {
  const open = input.store.ensureOpen(input.now.toISOString());
  const viewing = input.bookId ? input.store.getBook(input.bookId) : open;
  const positions = input.store.positions(viewing.id);
  const quotes = viewing.id === open.id ? input.memory.quotes : [];
  const state = { cash: viewing.cash, positions, watchlist: viewing.watchlist };
  const equity = equityOf(state, quotes);
  const clock = shanghaiClock(input.now);
  const points = input.store.equityPoints(viewing.id);
  const savedDaily = input.store.dailyReturns(viewing.id);
  const todayPoints = points.filter((point) => point.minute.startsWith(clock.date));
  const daily = [...savedDaily];
  if (todayPoints.length > 0 && !daily.some((row) => row.date === clock.date)) {
    const startEquity = todayPoints[0].equity;
    const endEquity = todayPoints[todayPoints.length - 1].equity;
    daily.push({
      date: clock.date,
      startEquity,
      endEquity,
      pnl: Math.round((endEquity - startEquity) * 100) / 100,
      returnPct: startEquity === 0 ? 0 : (endEquity - startEquity) / startEquity,
    });
  }
  const curve =
    savedDaily.length > 0
      ? daily.map((row) => ({ label: row.date, equity: row.endEquity }))
      : points.map((point) => ({ label: point.minute.slice(11), equity: point.equity }));
  const liveEquity = viewing.id === open.id ? equity : (points.at(-1)?.equity ?? viewing.cash);
  const readOnly = viewing.id !== open.id;
  const nextStartAt =
    !readOnly && input.memory.sessionLabel === "连续竞价" && !input.memory.inFlight
      ? new Date(
          (input.memory.lastStartedAt ?? input.now.getTime()) +
            (input.memory.lastStartedAt ? 5 * 60 * 1000 : 0),
        ).toISOString()
      : null;
  const todayPnl = readOnly
    ? (daily.at(-1)?.pnl ?? 0)
    : liveEquity - (todayPoints[0]?.equity ?? viewing.initialCash);

  return {
    sessionLabel: readOnly ? "历史账户" : input.memory.sessionLabel,
    sessionOpen: !readOnly && input.memory.sessionLabel === "连续竞价",
    quoteError: input.memory.quoteError,
    quotesStale: input.memory.stale,
    apiKeyConfigured: input.hasApiKey,
    decision: {
      inFlight: input.memory.inFlight,
      nextStartAt,
      lastDurationMs: input.memory.lastDurationMs,
      lastRunId: input.memory.lastRunId,
      lastMessage: input.memory.lastMessage,
    },
    activeBookId: open.id,
    viewingBookId: viewing.id,
    readOnly,
    books: input.store.listBooks().map((book) => ({
      id: book.id,
      createdAt: book.createdAt,
      closedAt: book.closedAt,
    })),
    cash: viewing.cash,
    equity: liveEquity,
    marketValue: viewing.id === open.id ? marketValue(state, quotes) : Math.max(0, liveEquity - viewing.cash),
    initialCash: viewing.initialCash,
    todayPnl,
    todayStocks: readOnly
      ? []
      : todayByStock({
          date: clock.date,
          positions,
          trades: input.store.trades(viewing.id),
          quotes,
        }),
    totalPnl: liveEquity - viewing.initialCash,
    totalReturn: viewing.initialCash === 0 ? 0 : (liveEquity - viewing.initialCash) / viewing.initialCash,
    watchlist: viewing.watchlist,
    quotes: quotes
      .filter(
        (quote) =>
          viewing.watchlist.includes(quote.code) ||
          positions.some((position) => position.code === quote.code && position.qty > 0),
      )
      .map((quote) => ({
        code: quote.code,
        name: quote.name,
        price: quote.price,
        changePct: quote.changePct,
        prevClose: quote.prevClose,
      })),
    positions: positions.map((position) => {
      const price = quotes.find((quote) => quote.code === position.code)?.price ?? position.avgCost;
      const value = position.qty * price;
      return {
        code: position.code,
        name: position.name,
        qty: position.qty,
        availableQty: position.availableQty,
        avgCost: position.avgCost,
        price,
        marketValue: value,
        pnl: value - position.avgCost * position.qty,
      };
    }),
    curve,
    daily,
    trades: input.store.trades(viewing.id),
    decisions: input.store.decisions(viewing.id),
  };
}
