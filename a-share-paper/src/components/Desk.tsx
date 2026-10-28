"use client";

import { useEffect, useRef, useState } from "react";

import { SELECTION_RULES } from "@/lib/ai/selection";
import type { DeskView } from "@/lib/desk/types";
import { formatShanghai } from "@/lib/time";

import styles from "./Desk.module.css";

const STATUS_LABEL: Record<string, string> = {
  filled: "已成交",
  rejected: "已拒绝",
  noop: "观望",
  tool: "调用了工具",
  timeout: "超时",
  sandbox: "沙箱不可用",
  failed: "助手失败",
  parse: "无法解析",
  missing_key: "缺少密钥",
  discarded: "已作废",
};

export function DeskApp() {
  const [bookId, setBookId] = useState<number | null>(null);
  const [view, setView] = useState<DeskView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watchlist, setWatchlist] = useState("");
  const editingWatchlist = useRef(false);

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      const query = bookId === null ? "" : `?book=${bookId}`;
      const response = await fetch(`/api/desk${query}`, { cache: "no-store" });
      const body = (await response.json()) as DeskView & { error?: string };
      if (stopped) return;
      if (!response.ok) {
        setError(body.error ?? "读取失败");
        return;
      }
      setError(null);
      setView(body);
      if (!editingWatchlist.current && (bookId === null || bookId === body.activeBookId)) {
        setWatchlist(body.watchlist.join(" "));
      }
    };
    void load();
    const timer = setInterval(() => {
      void load();
    }, 5000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [bookId]);

  if (!view) {
    return <main className={styles.page}>{error ?? "正在读取行情和账户…"}</main>;
  }

  return (
    <DeskScreen
      view={view}
      watchlist={watchlist}
      error={error}
      onWatchlist={(value) => {
        editingWatchlist.current = true;
        setWatchlist(value);
      }}
      onBook={(id) => setBookId(id)}
      onSaveWatchlist={async () => {
        const response = await fetch("/api/desk/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ codes: watchlist }),
        });
        const body = (await response.json()) as DeskView & { error?: string };
        if (!response.ok) {
          setError(body.error ?? "自选保存失败");
          return;
        }
        setError(null);
        setView(body);
        setBookId(body.activeBookId);
        editingWatchlist.current = false;
        setWatchlist(body.watchlist.join(" "));
      }}
      onReset={async () => {
        if (!window.confirm("重置会封存当前账户，并新开一个 100 万的账户。")) return;
        const response = await fetch("/api/desk/reset", { method: "POST" });
        const body = (await response.json()) as DeskView;
        setView(body);
        setBookId(body.activeBookId);
        setWatchlist(body.watchlist.join(" "));
      }}
    />
  );
}

export function DeskScreen({
  view,
  watchlist,
  error,
  onWatchlist,
  onBook,
  onSaveWatchlist,
  onReset,
}: {
  view: DeskView;
  watchlist: string;
  error: string | null;
  onWatchlist: (value: string) => void;
  onBook: (id: number) => void;
  onSaveWatchlist: () => void;
  onReset: () => void;
}) {
  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <div>
          <p className={styles.kicker}>模拟盘 · 不会真实下单</p>
          <h1>A股看盘</h1>
        </div>
        <div className={styles.status}>
          <strong className={view.sessionOpen ? styles.open : styles.closed}>{view.sessionLabel}</strong>
          <span>{decisionText(view)}</span>
        </div>
      </header>

      {!view.apiKeyConfigured ? (
        <p className={styles.banner}>未配置 CURSOR_API_KEY，助手不会下单。把密钥写进 .env.local 后重启。</p>
      ) : null}
      {view.quotesStale ? <p className={styles.banner}>行情暂时不可用，下面显示的是上一笔数据。</p> : null}
      {error ? <p className={styles.banner}>{error}</p> : null}

      <section className={styles.metrics}>
        <Metric label="现金" value={yuan(view.cash)} />
        <Metric label="总权益" value={yuan(view.equity)} />
        <Metric label="今日盈亏" value={signedYuan(view.todayPnl)} tone={tone(view.todayPnl)} />
        <Metric label="累计盈亏" value={signedYuan(view.totalPnl)} tone={tone(view.totalPnl)} />
        <Metric label="累计收益率" value={percent(view.totalReturn)} tone={tone(view.totalReturn)} />
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>权益曲线</h2>
          <label>
            账户
            <select
              aria-label="账户"
              value={view.viewingBookId}
              onChange={(event) => onBook(Number(event.target.value))}
            >
              {view.books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.closedAt ? `已结束 #${book.id}` : `当前 #${book.id}`}
                </option>
              ))}
            </select>
          </label>
        </div>
        <EquityChart points={view.curve} />
        <table>
          <thead>
            <tr>
              <th>日期</th>
              <th>期初权益</th>
              <th>期末权益</th>
              <th>盈亏</th>
              <th>收益率</th>
            </tr>
          </thead>
          <tbody>
            {view.daily.length === 0 ? (
              <tr>
                <td colSpan={5}>还没有每日收益</td>
              </tr>
            ) : (
              view.daily.map((row) => (
                <tr key={row.date}>
                  <td>{row.date}</td>
                  <td>{yuan(row.startEquity)}</td>
                  <td>{yuan(row.endEquity)}</td>
                  <td className={tone(row.pnl)}>{signedYuan(row.pnl)}</td>
                  <td className={tone(row.returnPct)}>{percent(row.returnPct)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className={styles.panel}>
        <h2>今日盈亏</h2>
        {view.todayStocks.length === 0 ? (
          <p className={styles.empty}>
            {view.positions.length > 0 ? "等待行情后按股票显示今日盈亏" : "今天还没有持仓或成交"}
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>股票</th>
                <th>盈亏</th>
              </tr>
            </thead>
            <tbody>
              {view.todayStocks.map((stock) => (
                <tr key={stock.code}>
                  <td>
                    {stock.name}
                    <span className={styles.code}>{stock.code}</span>
                  </td>
                  <td className={tone(stock.pnl)}>{signedYuan(stock.pnl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={styles.split}>
        <div className={styles.panel}>
          <h2>行情</h2>
          <table>
            <thead>
              <tr>
                <th>代码</th>
                <th>名称</th>
                <th>最新</th>
                <th>涨跌幅</th>
              </tr>
            </thead>
            <tbody>
              {view.quotes.length === 0 ? (
                <tr>
                  <td colSpan={4}>{view.readOnly ? "历史账户不刷新行情" : "等待行情"}</td>
                </tr>
              ) : (
                view.quotes.map((quote) => (
                  <tr key={quote.code}>
                    <td>{quote.code}</td>
                    <td>{quote.name}</td>
                    <td>{yuan(quote.price)}</td>
                    <td className={tone(quote.changePct)}>{quote.changePct.toFixed(2)}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className={styles.panel}>
          <h2>持仓</h2>
          <table>
            <thead>
              <tr>
                <th>代码</th>
                <th>数量</th>
                <th>可卖</th>
                <th>市值</th>
                <th>浮动盈亏</th>
              </tr>
            </thead>
            <tbody>
              {view.positions.length === 0 ? (
                <tr>
                  <td colSpan={5}>空仓</td>
                </tr>
              ) : (
                view.positions.map((position) => (
                  <tr key={position.code}>
                    <td>
                      {position.name}
                      <span className={styles.code}>{position.code}</span>
                    </td>
                    <td>{position.qty}</td>
                    <td>{position.availableQty}</td>
                    <td>{yuan(position.marketValue)}</td>
                    <td className={tone(position.pnl)}>{signedYuan(position.pnl)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.panel}>
        <h2>选股逻辑</h2>
        <ol className={styles.rules}>
          {SELECTION_RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ol>
        <p className={styles.logic}>
          {view.decisions.find((decision) => decision.logic)?.logic ?? "还没有一轮写出选股逻辑。"}
        </p>
      </section>

      <section className={styles.panel}>
        <h2>决策与成交</h2>
        <table>
          <thead>
            <tr>
              <th>时间</th>
              <th>状态</th>
              <th>内容</th>
            </tr>
          </thead>
          <tbody>
            {view.decisions.length === 0 ? (
              <tr>
                <td colSpan={3}>还没有决策</td>
              </tr>
            ) : (
              view.decisions.map((decision) => (
                <tr key={decision.id}>
                  <td>{formatShanghai(decision.ts)}</td>
                  <td>{STATUS_LABEL[decision.status] ?? decision.status}</td>
                  <td>{decision.summary}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <table>
          <thead>
            <tr>
              <th>时间</th>
              <th>方向</th>
              <th>代码</th>
              <th>数量</th>
              <th>价格</th>
              <th>费用</th>
              <th>理由</th>
            </tr>
          </thead>
          <tbody>
            {view.trades.length === 0 ? (
              <tr>
                <td colSpan={7}>还没有成交</td>
              </tr>
            ) : (
              view.trades.map((trade) => (
                <tr key={trade.id}>
                  <td>{formatShanghai(trade.ts)}</td>
                  <td>{trade.side === "buy" ? "买入" : "卖出"}</td>
                  <td>{trade.name}</td>
                  <td>{trade.qty}</td>
                  <td>{yuan(trade.price)}</td>
                  <td>{yuan(trade.fee)}</td>
                  <td>{trade.reason}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {view.readOnly ? null : (
        <section className={styles.controls}>
          <label>
            自选代码，最多 10 只，可以留空。留空后只从榜单和持仓里选
            <input
              aria-label="自选代码"
              value={watchlist}
              onChange={(event) => onWatchlist(event.target.value)}
            />
          </label>
          <button type="button" onClick={onSaveWatchlist}>
            保存自选
          </button>
          <button type="button" className={styles.reset} onClick={onReset}>
            重置账户
          </button>
        </section>
      )}
      <p className={styles.foot}>
        模拟撮合按 T+1、涨跌停、整手和费用规则成交。行情来自东方财富公开接口，可能延迟或中断。这不是投资建议。
      </p>
    </main>
  );
}

function EquityChart({ points }: { points: { label: string; equity: number }[] }) {
  if (points.length === 0) return <p className={styles.empty}>权益会在行情刷新后按分钟记下。</p>;
  const width = 640;
  const height = 160;
  const values = points.map((point) => point.equity);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const coords = points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * (width - 8) + 4;
    const y = height - ((point.equity - min) / span) * (height - 20) - 10;
    return `${x},${y}`;
  });
  return (
    <svg className={styles.chart} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="权益曲线">
      <polyline points={coords.join(" ")} />
    </svg>
  );
}

function Metric({ label, value, tone: toneClass }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong className={toneClass}>{value}</strong>
    </div>
  );
}

function decisionText(view: DeskView): string {
  if (view.decision.inFlight) return "决策中";
  if (view.decision.lastMessage) {
    const duration = view.decision.lastDurationMs ? ` · ${Math.round(view.decision.lastDurationMs / 1000)} 秒` : "";
    const run = view.decision.lastRunId ? ` · ${view.decision.lastRunId}` : "";
    return `${view.decision.lastMessage}${duration}${run}`;
  }
  if (!view.sessionOpen) return "休市不下单";
  if (!view.decision.nextStartAt) return "等待下一轮";
  const wait = new Date(view.decision.nextStartAt).getTime() - Date.now();
  if (wait <= 0) return "即将决策";
  return `距下次决策 ${Math.ceil(wait / 1000)} 秒`;
}

function yuan(value: number): string {
  return value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function signedYuan(value: number): string {
  const text = yuan(Math.abs(value));
  if (value > 0) return `+${text}`;
  if (value < 0) return `-${text}`;
  return text;
}

function percent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function tone(value: number): string {
  if (value > 0) return styles.up;
  if (value < 0) return styles.down;
  return "";
}
