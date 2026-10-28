import { maxBuyLots, type BookState, type Quote } from "@/lib/broker/apply";
import type { Candidate } from "@/lib/market/board";

export type DecisionSnapshot = {
  cash: number;
  equity: number;
  positions: {
    code: string;
    name: string;
    qty: number;
    availableQty: number;
    avgCost: number;
  }[];
  quotes: {
    code: string;
    name: string;
    price: number;
    prevClose: number;
    changePct: number;
    high: number;
    low: number;
    volume: number;
    maxBuyLots: number;
  }[];
  recentDecisions: { summary: string; status: string }[];
  candidates: {
    code: string;
    name: string;
    price: number;
    changePct: number;
    amount: number;
    tag: string;
    maxBuyLots: number;
  }[];
};

export function buildSnapshot(
  state: BookState,
  equity: number,
  quotes: Quote[],
  recentDecisions: { summary: string; status: string }[],
  candidates: Candidate[] = [],
): DecisionSnapshot {
  return {
    cash: state.cash,
    equity,
    positions: state.positions.map((position) => ({
      code: position.code,
      name: position.name,
      qty: position.qty,
      availableQty: position.availableQty,
      avgCost: position.avgCost,
    })),
    quotes: quotes.map((quote) => ({
      code: quote.code,
      name: quote.name,
      price: quote.price,
      prevClose: quote.prevClose,
      changePct: quote.changePct,
      high: quote.high,
      low: quote.low,
      volume: quote.volume,
      maxBuyLots: maxBuyLots(state, quote),
    })),
    recentDecisions,
    candidates: candidates.map((candidate) => ({
      code: candidate.code,
      name: candidate.name,
      price: candidate.price,
      changePct: candidate.changePct,
      amount: candidate.amount,
      tag: candidate.tag,
      maxBuyLots: maxBuyLots(state, candidate),
    })),
  };
}
