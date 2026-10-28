export const PLATFORM_IDS = [
  "zhihu",
  "weibo",
  "bilibili",
  "baidu",
  "douyin",
  "hupu",
  "toutiao",
  "xiaohongshu",
] as const;

export type PlatformId = (typeof PLATFORM_IDS)[number];

export interface TrendItem {
  rank: number;
  title: string;
  url: string;
  metricLabel?: string;
  metricValue?: string;
}

export type PlatformStatus = "ok" | "stale" | "unavailable";

export interface PlatformResult {
  platform: PlatformId;
  name: string;
  status: PlatformStatus;
  items: TrendItem[];
  updatedAt?: string;
  error?: string;
}

export interface TrendsResponse {
  platforms: PlatformResult[];
  updatedAt: string;
}

export interface TrendAdapter {
  id: PlatformId;
  name: string;
  fetch: () => Promise<TrendItem[]>;
}
