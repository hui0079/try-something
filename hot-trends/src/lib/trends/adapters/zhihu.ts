import { isRecord } from "../format";
import { fetchJson } from "../http";
import type { TrendAdapter, TrendItem } from "../types";
import { requireItems } from "./shared";

export function parseZhihu(payload: unknown): TrendItem[] {
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    return [];
  }

  return payload.data
    .flatMap((entry, index): TrendItem[] => {
      if (!isRecord(entry) || !isRecord(entry.target)) {
        return [];
      }

      const { title, url } = entry.target;
      if (typeof title !== "string" || typeof url !== "string") {
        return [];
      }

      const detail =
        typeof entry.detail_text === "string"
          ? entry.detail_text.replace(/热度\s*$/u, "").trim()
          : undefined;

      return [
        {
          rank: index + 1,
          title,
          url,
          ...(detail
            ? { metricLabel: "热度", metricValue: detail }
            : {}),
        },
      ];
    })
    .slice(0, 10)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

export const zhihuAdapter: TrendAdapter = {
  id: "zhihu",
  name: "知乎",
  async fetch() {
    const payload = await fetchJson(
      "https://api.zhihu.com/topstory/hot-lists/total?limit=10",
      { referer: "https://www.zhihu.com/hot" },
    );
    return requireItems("知乎", parseZhihu(payload));
  },
};
