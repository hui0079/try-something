import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { INITIAL_CASH, type Position } from "@/lib/broker/apply";
import { DEFAULT_WATCHLIST } from "@/lib/market/watchlist";

export type BookRecord = {
  id: number;
  createdAt: string;
  closedAt: string | null;
  initialCash: number;
  cash: number;
  watchlist: string[];
  sessionDate: string | null;
};

export type StoredTrade = {
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
};

export type StoredDecision = {
  id: number;
  ts: string;
  summary: string;
  status: string;
  logic: string;
};

export type EquityPoint = {
  minute: string;
  equity: number;
  cash: number;
  marketValue: number;
};

export type DailyReturn = {
  date: string;
  startEquity: number;
  endEquity: number;
  pnl: number;
  returnPct: number;
};

type BookRow = {
  id: number;
  created_at: string;
  closed_at: string | null;
  initial_cash: number;
  cash: number;
  watchlist_json: string;
  session_date: string | null;
};

export class PaperStore {
  constructor(private readonly db: DatabaseSync) {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY,
        created_at TEXT NOT NULL,
        closed_at TEXT,
        initial_cash REAL NOT NULL,
        cash REAL NOT NULL,
        watchlist_json TEXT NOT NULL,
        session_date TEXT
      );
      CREATE TABLE IF NOT EXISTS positions (
        book_id INTEGER NOT NULL,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        qty INTEGER NOT NULL,
        available_qty INTEGER NOT NULL,
        avg_cost REAL NOT NULL,
        PRIMARY KEY (book_id, code)
      );
      CREATE TABLE IF NOT EXISTS trades (
        id INTEGER PRIMARY KEY,
        book_id INTEGER NOT NULL,
        ts TEXT NOT NULL,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        side TEXT NOT NULL,
        qty INTEGER NOT NULL,
        price REAL NOT NULL,
        fee REAL NOT NULL,
        realized_pnl REAL NOT NULL,
        reason TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS decisions (
        id INTEGER PRIMARY KEY,
        book_id INTEGER NOT NULL,
        ts TEXT NOT NULL,
        summary TEXT NOT NULL,
        status TEXT NOT NULL,
        detail_json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS equity_points (
        book_id INTEGER NOT NULL,
        minute TEXT NOT NULL,
        equity REAL NOT NULL,
        cash REAL NOT NULL,
        market_value REAL NOT NULL,
        PRIMARY KEY (book_id, minute)
      );
      CREATE TABLE IF NOT EXISTS daily_returns (
        book_id INTEGER NOT NULL,
        trade_date TEXT NOT NULL,
        start_equity REAL NOT NULL,
        end_equity REAL NOT NULL,
        pnl REAL NOT NULL,
        return_pct REAL NOT NULL,
        PRIMARY KEY (book_id, trade_date)
      );
    `);
  }

  static memory(): PaperStore {
    return new PaperStore(new DatabaseSync(":memory:"));
  }

  static file(filename: string): PaperStore {
    mkdirSync(path.dirname(filename), { recursive: true });
    const db = new DatabaseSync(filename);
    db.exec("PRAGMA journal_mode = WAL");
    return new PaperStore(db);
  }

  ensureOpen(nowIso: string): BookRecord {
    return this.openBook() ?? this.insertBook(nowIso, INITIAL_CASH, DEFAULT_WATCHLIST);
  }

  openBook(): BookRecord | null {
    const row = this.db
      .prepare("SELECT * FROM books WHERE closed_at IS NULL ORDER BY id DESC LIMIT 1")
      .get() as BookRow | undefined;
    return row ? mapBook(row) : null;
  }

  getBook(id: number): BookRecord {
    const row = this.db.prepare("SELECT * FROM books WHERE id = ?").get(id) as BookRow | undefined;
    if (!row) throw new Error("账户不存在");
    return mapBook(row);
  }

  listBooks(): BookRecord[] {
    const rows = this.db.prepare("SELECT * FROM books ORDER BY id DESC").all() as BookRow[];
    return rows.map(mapBook);
  }

  positions(bookId: number): Position[] {
    const rows = this.db
      .prepare(
        "SELECT code, name, qty, available_qty, avg_cost FROM positions WHERE book_id = ? ORDER BY code",
      )
      .all(bookId) as {
      code: string;
      name: string;
      qty: number;
      available_qty: number;
      avg_cost: number;
    }[];
    return rows.map((row) => ({
      code: row.code,
      name: row.name,
      qty: row.qty,
      availableQty: row.available_qty,
      avgCost: row.avg_cost,
    }));
  }

  saveState(bookId: number, cash: number, positions: Position[], watchlist: string[]): void {
    this.db.exec("BEGIN");
    try {
      this.db.prepare("UPDATE books SET cash = ?, watchlist_json = ? WHERE id = ?").run(
        cash,
        JSON.stringify(watchlist),
        bookId,
      );
      this.db.prepare("DELETE FROM positions WHERE book_id = ?").run(bookId);
      const insert = this.db.prepare(
        "INSERT INTO positions (book_id, code, name, qty, available_qty, avg_cost) VALUES (?, ?, ?, ?, ?, ?)",
      );
      for (const position of positions) {
        insert.run(bookId, position.code, position.name, position.qty, position.availableQty, position.avgCost);
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  noteSession(bookId: number, today: string): { rolled: boolean } {
    const book = this.getBook(bookId);
    if (!book.sessionDate) {
      this.db.prepare("UPDATE books SET session_date = ? WHERE id = ?").run(today, bookId);
      return { rolled: false };
    }
    if (book.sessionDate === today) return { rolled: false };
    this.finalizeDay(bookId, book.sessionDate);
    this.db.prepare("UPDATE books SET session_date = ? WHERE id = ?").run(today, bookId);
    return { rolled: true };
  }

  recordEquity(bookId: number, minute: string, equity: number, cash: number, marketValue: number): void {
    this.db
      .prepare(
        `INSERT INTO equity_points (book_id, minute, equity, cash, market_value)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(book_id, minute) DO UPDATE SET
           equity = excluded.equity,
           cash = excluded.cash,
           market_value = excluded.market_value`,
      )
      .run(bookId, minute, equity, cash, marketValue);
  }

  equityPoints(bookId: number): EquityPoint[] {
    const rows = this.db
      .prepare(
        "SELECT minute, equity, cash, market_value FROM equity_points WHERE book_id = ? ORDER BY minute",
      )
      .all(bookId) as { minute: string; equity: number; cash: number; market_value: number }[];
    return rows.map((row) => ({
      minute: row.minute,
      equity: row.equity,
      cash: row.cash,
      marketValue: row.market_value,
    }));
  }

  finalizeDay(bookId: number, date: string): void {
    const rows = this.db
      .prepare(
        "SELECT equity FROM equity_points WHERE book_id = ? AND minute LIKE ? ORDER BY minute",
      )
      .all(bookId, `${date}T%`) as { equity: number }[];
    if (rows.length === 0) return;
    const startEquity = rows[0].equity;
    const endEquity = rows[rows.length - 1].equity;
    const pnl = Math.round((endEquity - startEquity) * 100) / 100;
    const returnPct = startEquity === 0 ? 0 : (endEquity - startEquity) / startEquity;
    this.db
      .prepare(
        `INSERT INTO daily_returns (book_id, trade_date, start_equity, end_equity, pnl, return_pct)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(book_id, trade_date) DO UPDATE SET
           start_equity = excluded.start_equity,
           end_equity = excluded.end_equity,
           pnl = excluded.pnl,
           return_pct = excluded.return_pct`,
      )
      .run(bookId, date, startEquity, endEquity, pnl, returnPct);
  }

  dailyReturns(bookId: number): DailyReturn[] {
    const rows = this.db
      .prepare(
        `SELECT trade_date, start_equity, end_equity, pnl, return_pct
         FROM daily_returns WHERE book_id = ? ORDER BY trade_date`,
      )
      .all(bookId) as {
      trade_date: string;
      start_equity: number;
      end_equity: number;
      pnl: number;
      return_pct: number;
    }[];
    return rows.map((row) => ({
      date: row.trade_date,
      startEquity: row.start_equity,
      endEquity: row.end_equity,
      pnl: row.pnl,
      returnPct: row.return_pct,
    }));
  }

  recordTrades(
    bookId: number,
    ts: string,
    trades: {
      code: string;
      name: string;
      side: string;
      qty: number;
      price: number;
      fee: number;
      realizedPnl: number;
      reason: string;
    }[],
  ): void {
    const insert = this.db.prepare(
      `INSERT INTO trades (book_id, ts, code, name, side, qty, price, fee, realized_pnl, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const trade of trades) {
      insert.run(
        bookId,
        ts,
        trade.code,
        trade.name,
        trade.side,
        trade.qty,
        trade.price,
        trade.fee,
        trade.realizedPnl,
        trade.reason,
      );
    }
  }

  trades(bookId: number): StoredTrade[] {
    const rows = this.db
      .prepare(
        `SELECT id, ts, code, name, side, qty, price, fee, realized_pnl, reason
         FROM trades WHERE book_id = ? ORDER BY id DESC`,
      )
      .all(bookId) as {
      id: number;
      ts: string;
      code: string;
      name: string;
      side: string;
      qty: number;
      price: number;
      fee: number;
      realized_pnl: number;
      reason: string;
    }[];
    return rows.map((row) => ({
      id: row.id,
      ts: row.ts,
      code: row.code,
      name: row.name,
      side: row.side,
      qty: row.qty,
      price: row.price,
      fee: row.fee,
      realizedPnl: row.realized_pnl,
      reason: row.reason,
    }));
  }

  recordDecision(bookId: number, ts: string, summary: string, status: string, detail: unknown): void {
    this.db
      .prepare(
        "INSERT INTO decisions (book_id, ts, summary, status, detail_json) VALUES (?, ?, ?, ?, ?)",
      )
      .run(bookId, ts, summary, status, JSON.stringify(detail));
  }

  decisions(bookId: number, limit = 20): StoredDecision[] {
    const rows = this.db
      .prepare(
        "SELECT id, ts, summary, status, detail_json FROM decisions WHERE book_id = ? ORDER BY id DESC LIMIT ?",
      )
      .all(bookId, limit) as { id: number; ts: string; summary: string; status: string; detail_json: string }[];
    return rows.map((row) => ({
      id: row.id,
      ts: row.ts,
      summary: row.summary,
      status: row.status,
      logic: logicFrom(row.detail_json),
    }));
  }

  reset(nowIso: string): BookRecord {
    this.db.prepare("UPDATE books SET closed_at = ? WHERE closed_at IS NULL").run(nowIso);
    return this.insertBook(nowIso, INITIAL_CASH, DEFAULT_WATCHLIST);
  }

  private insertBook(nowIso: string, cash: number, watchlist: string[]): BookRecord {
    const result = this.db
      .prepare(
        "INSERT INTO books (created_at, initial_cash, cash, watchlist_json) VALUES (?, ?, ?, ?)",
      )
      .run(nowIso, cash, cash, JSON.stringify(watchlist));
    return this.getBook(Number(result.lastInsertRowid));
  }
}

function logicFrom(detail: string): string {
  try {
    const parsed = JSON.parse(detail) as { logic?: unknown };
    return typeof parsed.logic === "string" ? parsed.logic : "";
  } catch {
    return "";
  }
}

function mapBook(row: BookRow): BookRecord {
  return {
    id: row.id,
    createdAt: row.created_at,
    closedAt: row.closed_at,
    initialCash: row.initial_cash,
    cash: row.cash,
    watchlist: JSON.parse(row.watchlist_json) as string[],
    sessionDate: row.session_date,
  };
}
