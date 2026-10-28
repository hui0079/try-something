import { formatCount, isRecord } from "../format";
import { fetchJson } from "../http";
import type { TrendAdapter, TrendItem } from "../types";
import { requireItems } from "./shared";

export function parseToutiao(payload: unknown): TrendItem[] {
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    return [];
  }

  return payload.data
    .flatMap((entry): TrendItem[] => {
      if (
        !isRecord(entry) ||
        typeof entry.ClusterIdStr !== "string" ||
        typeof entry.Title !== "string" ||
        !entry.Title
      ) {
        return [];
      }

      const metricValue = formatCount(entry.HotValue);
      return [
        {
          rank: 0,
          title: entry.Title,
          url: `https://www.toutiao.com/trending/${entry.ClusterIdStr}/`,
          ...(metricValue
            ? { metricLabel: "热度", metricValue }
            : {}),
        },
      ];
    })
    .slice(0, 10)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

export const toutiaoAdapter: TrendAdapter = {
  id: "toutiao",
  name: "今日头条",
  async fetch() {
    const payload = await fetchJson(
      "https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc",
      { referer: "https://www.toutiao.com/" },
    );
    return requireItems("今日头条", parseToutiao(payload));
  },
};
