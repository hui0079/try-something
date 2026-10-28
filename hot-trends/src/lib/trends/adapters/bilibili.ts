import { formatCount, isRecord } from "../format";
import { fetchJson } from "../http";
import type { TrendAdapter, TrendItem } from "../types";
import { requireItems } from "./shared";

export function parseBilibili(payload: unknown): TrendItem[] {
  if (
    !isRecord(payload) ||
    !isRecord(payload.data) ||
    !Array.isArray(payload.data.list)
  ) {
    return [];
  }

  return payload.data.list
    .flatMap((entry): TrendItem[] => {
      if (
        !isRecord(entry) ||
        typeof entry.title !== "string" ||
        typeof entry.bvid !== "string"
      ) {
        return [];
      }

      const metricValue = isRecord(entry.stat)
        ? formatCount(entry.stat.view)
        : undefined;

      return [
        {
          rank: 0,
          title: entry.title,
          url: `https://www.bilibili.com/video/${entry.bvid}`,
          ...(metricValue
            ? { metricLabel: "播放", metricValue }
            : {}),
        },
      ];
    })
    .slice(0, 10)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

export const bilibiliAdapter: TrendAdapter = {
  id: "bilibili",
  name: "哔哩哔哩",
  async fetch() {
    const payload = await fetchJson(
      "https://api.bilibili.com/x/web-interface/popular?pn=1&ps=10",
      { referer: "https://www.bilibili.com/v/popular/all/" },
    );
    return requireItems("哔哩哔哩", parseBilibili(payload));
  },
};
