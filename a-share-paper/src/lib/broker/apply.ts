export const INITIAL_CASH = 1_000_000;
export const LOT_SIZE = 100;
export const MAX_POSITION_RATIO = 0.3;

export type Side = "buy" | "sell";

export type Quote = {
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
};

export type Position = {
  code: string;
  name: string;
  qty: number;
  availableQty: number;
  avgCost: number;
};

export type BookState = {
  cash: number;
  positions: Position[];
  watchlist: string[];
};

export type OrderRequest = {
  code: string;
  side: Side;
  lots: number;
  reason: string;
};

export type Fill = {
  code: string;
  name: string;
  side: Side;
  qty: number;
  price: number;
  fee: number;
  realizedPnl: number;
  reason: string;
};

export type Reject = {
  code: string;
  side: Side;
  lots: number;
  reason: string;
};

export type ApplyResult = {
  state: BookState;
  fills: Fill[];
  rejects: Reject[];
};

export type FeeBreakdown = {
  commission: number;
  stamp: number;
  transfer: number;
  total: number;
};

export function roundFen(yuan: number): number {
  return Math.round(yuan * 100) / 100;
}

function cents(yuan: number): number {
  return Math.round(yuan * 100);
}

function yuan(centsValue: number): number {
  return centsValue / 100;
}

export function feesFor(side: Side, amountYuan: number): FeeBreakdown {
  const amountCents = cents(amountYuan);
  const commission = Math.max(500, Math.round(amountCents * 0.00025));
  const stamp = side === "sell" ? Math.round(amountCents * 0.0005) : 0;
  const transfer = Math.round(amountCents * 0.00001);
  return {
    commission: yuan(commission),
    stamp: yuan(stamp),
    transfer: yuan(transfer),
    total: yuan(commission + stamp + transfer),
  };
}

export function limitPrices(
  code: string,
  name: string,
  prevClose: number,
): { up: number; down: number } | { error: string } {
  if (name.toUpperCase().includes("ST")) {
    return { error: "ST 标的不交易" };
  }
  const ratio = limitRatio(code);
  if (ratio === null) {
    return { error: "不支持的代码" };
  }
  const prevCents = cents(prevClose);
  return {
    up: yuan(Math.round(prevCents * (1 + ratio))),
    down: yuan(Math.round(prevCents * (1 - ratio))),
  };
}

function limitRatio(code: string): number | null {
  if (/^(300|301|688|689)/.test(code)) return 0.2;
  if (/^(000|001|002|003|600|601|603|605)/.test(code)) return 0.1;
  return null;
}

export function rollSession(state: BookState): BookState {
  return {
    ...state,
    positions: state.positions.map((position) => ({
      ...position,
      availableQty: position.qty,
    })),
  };
}

export function marketValue(state: BookState, quotes: Quote[]): number {
  return state.positions.reduce((sum, position) => {
    return sum + position.qty * markPrice(position, quotes);
  }, 0);
}

export function equityOf(state: BookState, quotes: Quote[]): number {
  return roundFen(state.cash + marketValue(state, quotes));
}

export function applyOrders(
  state: BookState,
  orders: OrderRequest[],
  quotes: Quote[],
): ApplyResult {
  const ordered = [
    ...orders.filter((order) => order.side === "sell"),
    ...orders.filter((order) => order.side === "buy"),
  ];
  let next = cloneState(state);
  const fills: Fill[] = [];
  const rejects: Reject[] = [];

  for (const order of ordered) {
    const outcome = applyOne(next, order, quotes);
    if ("error" in outcome) {
      rejects.push({
        code: order.code,
        side: order.side,
        lots: order.lots,
        reason: outcome.error,
      });
      continue;
    }
    next = outcome.state;
    fills.push(outcome.fill);
  }

  return { state: next, fills, rejects };
}

export function maxBuyLots(state: BookState, quote: Quote): number {
  let low = 0;
  let high = Math.floor(state.cash / quote.price / LOT_SIZE);
  if (!Number.isFinite(high) || high < 0) return 0;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const result = applyOrders(
      state,
      [{ code: quote.code, side: "buy", lots: mid, reason: "试算" }],
      [quote],
    );
    if (result.fills.length === 1) low = mid;
    else high = mid - 1;
  }
  return low;
}

function applyOne(
  state: BookState,
  order: OrderRequest,
  quotes: Quote[],
): { state: BookState; fill: Fill } | { error: string } {
  if (!Number.isInteger(order.lots) || order.lots <= 0) {
    return { error: "手数不合法" };
  }
  const quote = quotes.find((item) => item.code === order.code);
  if (!quote || quote.price <= 0 || quote.prevClose <= 0) {
    return { error: "没有行情" };
  }
  const band = limitPrices(order.code, quote.name, quote.prevClose);
  if ("error" in band) return band;

  const qty = order.lots * LOT_SIZE;
  const priceCents = cents(quote.price);
  const upCents = cents(band.up);
  const downCents = cents(band.down);
  if (order.side === "buy" && priceCents >= upCents) return { error: "涨停不买" };
  if (order.side === "sell" && priceCents <= downCents) return { error: "跌停不卖" };

  const amount = yuan(priceCents * qty);
  const fee = feesFor(order.side, amount);
  const positions = state.positions.map((position) => ({ ...position }));
  const existing = positions.find((position) => position.code === order.code);

  if (order.side === "sell") {
    if (!existing || existing.availableQty < qty) return { error: "可卖数量不足" };
    const proceedsCents = priceCents * qty - cents(fee.total);
    const costCents = Math.round(existing.avgCost * qty * 100);
    const realized = yuan(proceedsCents - costCents);
    existing.qty -= qty;
    existing.availableQty -= qty;
    const nextPositions = existing.qty === 0
      ? positions.filter((position) => position.code !== order.code)
      : positions;
    return {
      state: { ...state, cash: yuan(cents(state.cash) + proceedsCents), positions: nextPositions },
      fill: {
        code: order.code,
        name: quote.name,
        side: "sell",
        qty,
        price: quote.price,
        fee: fee.total,
        realizedPnl: realized,
        reason: order.reason,
      },
    };
  }

  const costCents = priceCents * qty + cents(fee.total);
  if (cents(state.cash) < costCents) return { error: "资金不足" };

  const nextQty = (existing?.qty ?? 0) + qty;
  const nextMv = yuan(priceCents * nextQty);
  const cashAfter = yuan(cents(state.cash) - costCents);
  const otherMv = positions
    .filter((position) => position.code !== order.code)
    .reduce((sum, position) => sum + position.qty * markPrice(position, quotes), 0);
  const equityAfter = cashAfter + nextMv + otherMv;
  if (nextMv > equityAfter * MAX_POSITION_RATIO + 0.001) {
    return { error: "超过单票仓位上限" };
  }

  const previousCost = existing ? existing.avgCost * existing.qty : 0;
  const avgCost = roundTo( (previousCost + yuan(costCents)) / nextQty, 4);
  if (existing) {
    existing.qty = nextQty;
    existing.avgCost = avgCost;
    existing.name = quote.name;
  } else {
    positions.push({
      code: order.code,
      name: quote.name,
      qty: nextQty,
      availableQty: 0,
      avgCost,
    });
  }

  return {
    state: { ...state, cash: cashAfter, positions },
    fill: {
      code: order.code,
      name: quote.name,
      side: "buy",
      qty,
      price: quote.price,
      fee: fee.total,
      realizedPnl: 0,
      reason: order.reason,
    },
  };
}

function markPrice(position: Position, quotes: Quote[]): number {
  return quotes.find((quote) => quote.code === position.code)?.price ?? position.avgCost;
}

function cloneState(state: BookState): BookState {
  return {
    cash: state.cash,
    watchlist: [...state.watchlist],
    positions: state.positions.map((position) => ({ ...position })),
  };
}

function roundTo(value: number, digits: number): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}
