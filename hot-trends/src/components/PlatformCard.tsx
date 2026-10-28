import type { PlatformId, PlatformResult } from "@/lib/trends/types";

interface PlatformCardProps {
  result: PlatformResult;
  refreshing: boolean;
  onRetry: (platform: PlatformId) => void;
}

function formatTime(value?: string): string {
  if (!value) return "尚未成功更新";
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function PlatformCard({
  result,
  refreshing,
  onRetry,
}: PlatformCardProps) {
  const isUnavailable = result.status === "unavailable";

  return (
    <section className="platform-card" data-platform={result.platform}>
      <header className="platform-header">
        <div className="platform-identity">
          <span className="platform-dot" aria-hidden="true" />
          <div>
            <h2>{result.name}</h2>
            <p>更新于 {formatTime(result.updatedAt)}</p>
          </div>
        </div>
        <span className={`status status-${result.status}`}>
          {refreshing
            ? "刷新中"
            : result.status === "ok"
              ? "实时"
              : result.status === "stale"
                ? "旧数据"
                : "暂不可用"}
        </span>
      </header>

      {result.items.length > 0 ? (
        <ol className="trend-list">
          {result.items.map((item) => (
            <li key={`${item.rank}-${item.url}`}>
              <span className="rank">{item.rank}</span>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                title={item.title}
              >
                {item.title}
              </a>
              {item.metricValue ? (
                <span className="metric" title={item.metricLabel}>
                  {item.metricValue}
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <div className="empty-state">
          <p>{result.error ?? "暂时没有可展示的内容"}</p>
          <button
            type="button"
            onClick={() => onRetry(result.platform)}
            disabled={refreshing}
          >
            重试此平台
          </button>
        </div>
      )}

      {!isUnavailable && result.error ? (
        <p className="stale-message">{result.error}，正在展示上次数据</p>
      ) : null}
    </section>
  );
}
