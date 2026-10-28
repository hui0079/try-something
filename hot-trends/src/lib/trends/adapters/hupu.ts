import { formatCount, isRecord } from "../format";
import { fetchJson } from "../http";
import type { TrendAdapter, TrendItem } from "../types";
import { requireItems } from "./shared";

export function parseHupu(payload: unknown): TrendItem[] {
  if (
    !isRecord(payload) ||
    !isRecord(payload.data) ||
    !Array.isArray(payload.data.topicThreads)
  ) {
    return [];
  }

  return payload.data.topicThreads
    .flatMap((entry): TrendItem[] => {
      if (
        !isRecord(entry) ||
        typeof entry.title !== "string" ||
        !entry.title
      ) {
        return [];
      }

      const tid =
        typeof entry.tid === "string" || typeof entry.tid === "number"
          ? String(entry.tid)
          : undefined;
      if (!tid) {
        return [];
      }

      const metricValue = formatCount(entry.replies);
      return [
        {
          rank: 0,
          title: entry.title,
          url: `https://bbs.hupu.com/${tid}.html`,
          ...(metricValue
            ? { metricLabel: "回复", metricValue }
            : {}),
        },
      ];
    })
    .slice(0, 10)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

export const hupuAdapter: TrendAdapter = {
  id: "hupu",
  name: "虎扑",
  async fetch() {
    const payload = await fetchJson(
      "https://m.hupu.com/api/v2/bbs/topicThreads?topicId=1&page=1",
      { referer: "https://bbs.hupu.com/all-gambia" },
    );
    return requireItems("虎扑", parseHupu(payload));
  },
};
