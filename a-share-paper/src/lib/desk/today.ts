import { shanghaiClock } from "@/lib/time";

export type TodayStock = {
  code: string;
  name: string;
  pnl: number;
};

type PositionQty = {
  code: string;
  name: string;
  qty: number;
};

type TradeFill = {
  ts: string;
  code: string;
  name: string;
  side: string;
  qty: number;
  price: number;
  fee: number;
};

type Mark = {
  code: string;
  name: string;
  price: number;
  prevClose: number;
};

type Bucket = {
  code: string;
  name: string;
  qty: number;
  buyQty: number;
  buyNotional: number;
  buyFee: number;
  sellQty: number;
  sellNotional: number;
  sellFee: number;
};

export function todayByStock(input: {
  date: string;
  positions: PositionQty[];
  trades: TradeFill[];
  quotes: Mark[];
}): TodayStock[] {
  const buckets = new Map<string, Bucket>();
  const bucket = (code: string, name: string) => {
    const current = buckets.get(code) ?? {
      code,
      name,
      qty: 0,
      buyQty: 0,
      buyNotional: 0,
      buyFee: 0,
      sellQty: 0,
      sellNotional: 0,
      sellFee: 0,
    };
    if (!current.name && name) current.name = name;
    buckets.set(code, current);
    return current;
  };

  for (const position of input.positions) {
    if (position.qty <= 0) continue;
    bucket(position.code, position.name).qty = position.qty;
  }
  for (const trade of input.trades) {
    if (shanghaiClock(new Date(trade.ts)).date !== input.date) continue;
    const row = bucket(trade.code, trade.name);
    if (trade.side === "buy") {
      row.buyQty += trade.qty;
      row.buyNotional += trade.price * trade.qty;
      row.buyFee += trade.fee;
    } else if (trade.side === "sell") {
      row.sellQty += trade.qty;
      row.sellNotional += trade.price * trade.qty;
      row.sellFee += trade.fee;
    }
  }

  const rows: TodayStock[] = [];
  for (const row of buckets.values()) {
    const quote = input.quotes.find((item) => item.code === row.code);
    if (!quote || quote.price <= 0 || quote.prevClose <= 0) continue;
    const overnightQty = row.qty - row.buyQty;
    let pnl = 0;
    if (overnightQty > 0) pnl += overnightQty * (quote.price - quote.prevClose);
    if (row.sellQty > 0) pnl += row.sellNotional - row.sellQty * quote.prevClose - row.sellFee;
    if (row.buyQty > 0) pnl += row.buyQty * quote.price - row.buyNotional - row.buyFee;
    rows.push({
      code: row.code,
      name: row.name || quote.name || row.code,
      pnl: Math.round(pnl * 100) / 100,
    });
  }
  return rows.sort((left, right) => right.pnl - left.pnl || left.code.localeCompare(right.code));
}
