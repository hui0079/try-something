import { formatCount, isRecord } from "../format";
import { fetchJson } from "../http";
import type { TrendAdapter, TrendItem } from "../types";
import { requireItems } from "./shared";

export function parseWeibo(payload: unknown): TrendItem[] {
  if (
    !isRecord(payload) ||
    !isRecord(payload.data) ||
    !Array.isArray(payload.data.realtime)
  ) {
    return [];
  }

  return payload.data.realtime
    .flatMap((entry): TrendItem[] => {
      if (!isRecord(entry) || typeof entry.word !== "string" || !entry.word) {
        return [];
      }

      const url =
        typeof entry.scheme === "string" && entry.scheme.startsWith("http")
          ? entry.scheme
          : `https://s.weibo.com/weibo?q=${encodeURIComponent(entry.word)}`;
      const metricValue = formatCount(entry.num);

      return [
        {
          rank: 0,
          title: entry.word,
          url,
          ...(metricValue
            ? { metricLabel: "热度", metricValue }
            : {}),
        },
      ];
    })
    .slice(0, 10)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

export const weiboAdapter: TrendAdapter = {
  id: "weibo",
  name: "微博",
  async fetch() {
    const payload = await fetchJson("https://weibo.com/ajax/side/hotSearch", {
      referer: "https://weibo.com/hot/search",
    });
    return requireItems("微博", parseWeibo(payload));
  },
};
