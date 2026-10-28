import { formatCount, isRecord } from "../format";
import { fetchJson } from "../http";
import type { TrendAdapter, TrendItem } from "../types";
import { requireItems } from "./shared";

export function parseDouyin(payload: unknown): TrendItem[] {
  if (
    !isRecord(payload) ||
    !isRecord(payload.data) ||
    !Array.isArray(payload.data.word_list)
  ) {
    return [];
  }

  return payload.data.word_list
    .flatMap((entry): TrendItem[] => {
      if (!isRecord(entry) || typeof entry.word !== "string" || !entry.word) {
        return [];
      }

      const metricValue = formatCount(entry.hot_value);
      return [
        {
          rank: 0,
          title: entry.word,
          url: `https://www.douyin.com/search/${encodeURIComponent(entry.word)}`,
          ...(metricValue
            ? { metricLabel: "热度", metricValue }
            : {}),
        },
      ];
    })
    .slice(0, 10)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

export const douyinAdapter: TrendAdapter = {
  id: "douyin",
  name: "抖音",
  async fetch() {
    const payload = await fetchJson(
      "https://www.douyin.com/aweme/v1/web/hot/search/list/",
      { referer: "https://www.douyin.com/hot" },
    );
    return requireItems("抖音", parseDouyin(payload));
  },
};
