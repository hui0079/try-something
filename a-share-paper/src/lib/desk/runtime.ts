import path from "node:path";

import { parseDecision } from "@/lib/ai/parse";
import { startAgent } from "@/lib/agent/spawn";
import { fetchMarketQuotes } from "@/lib/market/quotes";
import type { Quote } from "@/lib/broker/apply";
import { normalizeWatchlist } from "@/lib/market/watchlist";
import { PaperStore } from "@/lib/db/store";
import { buildView, completeDecision, freshMemory, refreshDesk, type AgentRunResult } from "@/lib/desk/cycle";
import type { DeskMemory, DeskView } from "@/lib/desk/types";

type Runtime = {
  store: PaperStore;
  memory: DeskMemory;
  pulsing: boolean;
  started: boolean;
  generation: number;
  discardThrough: number;
  stopAgent: (() => void) | null;
  timer: ReturnType<typeof setInterval> | null;
};

const KEY = Symbol.for("a-share-paper.runtime");

function runtime(): Runtime {
  const holder = globalThis as typeof globalThis & { [key: symbol]: Runtime | undefined };
  if (!holder[KEY]) {
    holder[KEY] = {
      store: PaperStore.file(path.join(process.cwd(), "data", "paper.db")),
      memory: freshMemory(),
      pulsing: false,
      started: false,
      generation: 0,
      discardThrough: 0,
      stopAgent: null,
      timer: null,
    };
  }
  return holder[KEY] as Runtime;
}

export async function deskView(bookId?: number): Promise<DeskView> {
  const current = runtime();
  if (!current.started) {
    current.started = true;
    await pulse();
    current.timer = setInterval(() => {
      void pulse();
    }, 5000);
  }
  return buildView({
    store: current.store,
    memory: current.memory,
    now: new Date(),
    bookId,
    hasApiKey: Boolean(process.env.CURSOR_API_KEY),
  });
}

export function replaceWatchlist(codes: string[]): { error?: string } {
  const parsed = normalizeWatchlist(codes);
  if ("error" in parsed) return { error: parsed.error };
  const current = runtime();
  const book = current.store.ensureOpen(new Date().toISOString());
  current.store.saveState(book.id, book.cash, current.store.positions(book.id), parsed.codes);
  return {};
}

export function resetAccount(): void {
  const current = runtime();
  if (current.stopAgent) {
    current.discardThrough = current.generation;
    current.stopAgent();
    current.stopAgent = null;
    current.memory.inFlight = false;
  }
  current.store.reset(new Date().toISOString());
}

async function quotesForFill(current: Quote[], candidates: Quote[], result: AgentRunResult): Promise<Quote[]> {
  const merged = new Map<string, Quote>();
  for (const quote of candidates) merged.set(quote.code, quote);
  for (const quote of current) merged.set(quote.code, quote);
  if (!result.ok) return [...merged.values()];
  const parsed = parseDecision(result.text);
  if ("error" in parsed) return [...merged.values()];
  const codes = [...new Set(parsed.actions.map((action) => action.code))];
  if (codes.length === 0) return [...merged.values()];
  try {
    const loaded = await fetchMarketQuotes(codes);
    for (const quote of loaded.quotes) merged.set(quote.code, quote);
  } catch {
    // A failed refresh still leaves the board price for the broker to check.
  }
  return [...merged.values()];
}

async function pulse(): Promise<void> {
  const current = runtime();
  if (current.pulsing) return;
  current.pulsing = true;
  try {
    const now = new Date();
    const result = await refreshDesk({
      store: current.store,
      memory: current.memory,
      now,
      hasApiKey: Boolean(process.env.CURSOR_API_KEY),
    });
    current.memory = result.memory;
    if (result.action === "cancel") {
      current.discardThrough = current.generation;
      current.stopAgent?.();
      current.stopAgent = null;
      current.memory.inFlight = false;
      const dropped = result.memory.sessionLabel === "休市" ? "休市，本轮作废" : `${result.memory.sessionLabel}，本轮作废`;
      current.memory.lastMessage = dropped;
      const book = current.store.openBook();
      if (book) {
        current.store.recordDecision(book.id, now.toISOString(), dropped, "discarded", {});
      }
    }
    if (result.action === "start" && result.snapshot) {
      const book = current.store.openBook();
      if (!book) return;
      current.generation += 1;
      const generation = current.generation;
      current.memory.inFlight = true;
      current.memory.lastStartedAt = now.getTime();
      current.memory.lastMessage = "决策中";
      const handle = startAgent(result.snapshot);
      current.stopAgent = handle.stop;
      void handle.done
        .then(async (agentResult) => {
          if (generation <= current.discardThrough) return;
          const tradableCodes = [
            ...new Set([
              ...current.memory.candidates.map((candidate) => candidate.code),
              ...current.memory.quotes.map((quote) => quote.code),
              ...current.store.positions(book.id).map((position) => position.code),
            ]),
          ];
          const quotes = await quotesForFill(current.memory.quotes, current.memory.candidates, agentResult);
          current.memory.quotes = quotes;
          completeDecision({
            store: current.store,
            bookId: book.id,
            result: agentResult,
            quotes,
            tradableCodes,
            nowIso: new Date().toISOString(),
          });
          current.memory.lastRunId = agentResult.runId ?? null;
          current.memory.lastDurationMs = agentResult.durationMs ?? null;
          current.memory.lastMessage = agentResult.ok ? "决策已返回" : agentResult.message;
        })
        .finally(() => {
          if (current.generation === generation) {
            current.memory.inFlight = false;
            current.stopAgent = null;
          }
        });
    }
  } finally {
    current.pulsing = false;
  }
}
