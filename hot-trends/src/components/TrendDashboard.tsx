"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  PlatformId,
  PlatformResult,
  TrendsResponse,
} from "@/lib/trends/types";
import { isVisitorId } from "@/lib/presence/store";
import { PlatformCard } from "./PlatformCard";
import { ThemeToggle } from "./ThemeToggle";

export const AUTO_REFRESH_MS = 30 * 60 * 1000;
const HEARTBEAT_MS = 20_000;
const VISITOR_STORAGE_KEY = "hot-trends-visitor";

function currentVisitorId(): string {
  const existing = window.localStorage.getItem(VISITOR_STORAGE_KEY);
  if (isVisitorId(existing)) {
    return existing;
  }

  const created = crypto.randomUUID();
  window.localStorage.setItem(VISITOR_STORAGE_KEY, created);
  return created;
}

function formatUpdatedAt(value?: string): string {
  if (!value) return "等待首次更新";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function formatCountdown(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function TrendDashboard() {
  const [data, setData] = useState<TrendsResponse>();
  const [error, setError] = useState<string>();
  const [refreshNotice, setRefreshNotice] = useState<{
    message: string;
    partial: boolean;
  }>();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingPlatform, setRefreshingPlatform] = useState<PlatformId>();
  const [nextRefreshAt, setNextRefreshAt] = useState(
    () => Date.now() + AUTO_REFRESH_MS,
  );
  const [now, setNow] = useState(() => Date.now());
  const [presence, setPresence] = useState<{
    online: number;
    today: number;
  }>();

  const load = useCallback(
    async (force = false, platform?: PlatformId) => {
      if (platform) setRefreshingPlatform(platform);
      else setRefreshing(true);
      setError(undefined);
      if (force) setRefreshNotice(undefined);

      const query = new URLSearchParams();
      if (force) query.set("refresh", "1");
      if (platform) query.set("platform", platform);
      const url = `/api/trends${query.size ? `?${query}` : ""}`;

      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`请求失败 (${response.status})`);
        }
        const next = (await response.json()) as TrendsResponse;
        setData((current) => {
          if (!platform || !current) return next;
          const refreshed = next.platforms[0];
          return {
            updatedAt: next.updatedAt,
            platforms: current.platforms.map((entry) =>
              entry.platform === platform ? refreshed : entry,
            ),
          };
        });
        const nextAt = Date.now() + AUTO_REFRESH_MS;
        setNextRefreshAt(nextAt);
        setNow(Date.now());
        if (force) {
          const available = next.platforms.filter(
            (entry) => entry.status !== "unavailable",
          ).length;
          setRefreshNotice({
            message: `刷新完成，${available}/${next.platforms.length} 个平台可用`,
            partial: available < next.platforms.length,
          });
        }
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : "刷新失败，请稍后再试",
        );
      } finally {
        setRefreshing(false);
        setRefreshingPlatform(undefined);
      }
    },
    [],
  );

  useEffect(() => {
    let stopped = false;

    const beat = async () => {
      try {
        const response = await fetch("/api/presence", {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitorId: currentVisitorId() }),
        });
        if (!response.ok) {
          return;
        }
        const next = (await response.json()) as {
          online?: unknown;
          today?: unknown;
        };
        if (
          !stopped &&
          typeof next.online === "number" &&
          typeof next.today === "number"
        ) {
          setPresence({ online: next.online, today: next.today });
        }
      } catch {
        // 人数统计失败时保留热榜，不打断页面。
      }
    };

    const heartbeatTimer = window.setTimeout(() => {
      void beat();
    }, 0);
    const heartbeatInterval = window.setInterval(() => {
      void beat();
    }, HEARTBEAT_MS);

    return () => {
      stopped = true;
      window.clearTimeout(heartbeatTimer);
      window.clearInterval(heartbeatInterval);
    };
  }, []);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => {
      void load();
    }, 0);
    const refreshTimer = window.setInterval(() => {
      void load();
    }, AUTO_REFRESH_MS);
    const countdownTimer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(refreshTimer);
      window.clearInterval(countdownTimer);
    };
  }, [load]);

  const countdown = useMemo(
    () => formatCountdown(nextRefreshAt - now),
    [nextRefreshAt, now],
  );

  return (
    <main className="dashboard-shell">
      <ThemeToggle />
      <header className="hero">
        <div>
          <p className="eyebrow">TREND PULSE</p>
          <h1>此刻，全网在聊什么</h1>
          <p className="hero-copy">
            八个平台的实时热榜汇于一处，少一点切换，多一点洞察。
          </p>
        </div>

        <div className="refresh-panel">
          <div className="refresh-meta">
            <span>上次更新</span>
            <strong>{formatUpdatedAt(data?.updatedAt)}</strong>
          </div>
          <div className="refresh-meta">
            <span>下次自动刷新</span>
            <strong>{countdown}</strong>
          </div>
          <div className="refresh-meta">
            <span>在线人数</span>
            <strong>{presence ? presence.online : "—"}</strong>
          </div>
          <div className="refresh-meta">
            <span>今日访问</span>
            <strong>{presence ? presence.today : "—"}</strong>
          </div>
          <button
            className="refresh-button"
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
          >
            <span aria-hidden="true" className={refreshing ? "spinning" : ""}>
              ↻
            </span>
            {refreshing ? "刷新中…" : "立即刷新"}
          </button>
        </div>
      </header>

      {error ? (
        <div className="global-error" role="alert">
          {error}。已有内容会继续保留。
        </div>
      ) : null}

      {refreshNotice ? (
        <div
          className={`refresh-notice${refreshNotice.partial ? " refresh-notice-partial" : ""}`}
          role="status"
        >
          {refreshNotice.message}
        </div>
      ) : null}

      {data ? (
        <div className="platform-grid">
          {data.platforms.map((result: PlatformResult) => (
            <PlatformCard
              key={result.platform}
              result={result}
              refreshing={
                refreshing || refreshingPlatform === result.platform
              }
              onRetry={(platform) => void load(true, platform)}
            />
          ))}
        </div>
      ) : (
        <div className="loading-grid" aria-label="正在加载热榜">
          {Array.from({ length: 8 }, (_, index) => (
            <div className="loading-card" key={index}>
              <span />
              {Array.from({ length: 7 }, (__, row) => (
                <i key={row} />
              ))}
            </div>
          ))}
        </div>
      )}

      <footer className="site-footer">
        榜单来自各平台公开页面或接口 · 每 30 分钟自动更新
      </footer>
    </main>
  );
}
