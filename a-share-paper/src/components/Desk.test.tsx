// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DeskScreen } from "@/components/Desk";
import type { DeskView } from "@/lib/desk/types";

const view: DeskView = {
  sessionLabel: "休市",
  sessionOpen: false,
  quoteError: null,
  quotesStale: false,
  apiKeyConfigured: false,
  decision: {
    inFlight: false,
    nextStartAt: null,
    lastDurationMs: null,
    lastRunId: null,
    lastMessage: null,
  },
  activeBookId: 1,
  viewingBookId: 1,
  readOnly: false,
  books: [{ id: 1, createdAt: "2026-10-28T02:00:00.000Z", closedAt: null }],
  cash: 1_000_000,
  equity: 1_000_000,
  marketValue: 0,
  initialCash: 1_000_000,
  todayPnl: 0,
  todayStocks: [{ code: "600519", name: "贵州茅台", pnl: 120.5 }],
  totalPnl: 0,
  totalReturn: 0,
  watchlist: ["600519"],
  quotes: [],
  positions: [],
  curve: [{ label: "10:32", equity: 1_000_000 }],
  daily: [],
  trades: [
    {
      id: 1,
      ts: "2026-10-28T06:53:06.000Z",
      code: "600519",
      name: "贵州茅台",
      side: "buy",
      qty: 100,
      price: 1324.71,
      fee: 5,
      realizedPnl: 0,
      reason: "试仓",
    },
  ],
  decisions: [
    {
      id: 1,
      ts: "2026-10-28T06:53:06.000Z",
      summary: "买入茅台",
      status: "filled",
      logic: "",
    },
  ],
};

describe("DeskScreen", () => {
  it("shows the closed session, the starting cash, and the missing key", () => {
    render(
      <DeskScreen
        view={view}
        watchlist="600519"
        error={null}
        onWatchlist={() => undefined}
        onBook={() => undefined}
        onSaveWatchlist={() => undefined}
        onReset={() => undefined}
      />,
    );
    expect(screen.getByText("休市")).toBeInTheDocument();
    expect(screen.getByText("未配置 CURSOR_API_KEY，助手不会下单。把密钥写进 .env.local 后重启。")).toBeInTheDocument();
    expect(screen.getAllByText("1,000,000.00").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "重置账户" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "权益曲线" })).toBeInTheDocument();
    expect(screen.getAllByText("贵州茅台").length).toBeGreaterThan(0);
    expect(screen.getByText("+120.50")).toBeInTheDocument();
    expect(screen.getByText("自选代码，最多 10 只，可以留空。留空后只从榜单和持仓里选")).toBeInTheDocument();
    expect(screen.getAllByText("2026-10-28 14:53:06")).toHaveLength(2);
    expect(screen.queryByText("2026-10-28 06:53:06")).not.toBeInTheDocument();
  });
});
