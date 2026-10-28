import { formatCount, isRecord } from "../format";
import { fetchText } from "../http";
import type { TrendAdapter, TrendItem } from "../types";
import { requireItems } from "./shared";

export function parseBaidu(html: string): TrendItem[] {
  const match = html.match(/<!--s-data:([\s\S]*?)-->/u);
  if (!match) {
    return [];
  }

  let payload: unknown;
  try {
    payload = JSON.parse(match[1]);
  } catch {
    return [];
  }

  if (
    !isRecord(payload) ||
    !isRecord(payload.data) ||
    !Array.isArray(payload.data.cards)
  ) {
    return [];
  }

  const hotList = payload.data.cards.find(
    (card) => isRecord(card) && card.component === "hotList",
  );
  if (!isRecord(hotList) || !Array.isArray(hotList.content)) {
    return [];
  }

  return hotList.content
    .flatMap((entry): TrendItem[] => {
      if (!isRecord(entry) || typeof entry.word !== "string" || !entry.word) {
        return [];
      }

      const url =
        typeof entry.rawUrl === "string" && entry.rawUrl.startsWith("http")
          ? entry.rawUrl
          : `https://www.baidu.com/s?wd=${encodeURIComponent(entry.word)}`;
      const metricValue = formatCount(entry.hotScore);

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

export const baiduAdapter: TrendAdapter = {
  id: "baidu",
  name: "百度",
  async fetch() {
    const html = await fetchText(
      "https://top.baidu.com/board?tab=realtime",
      { referer: "https://top.baidu.com/" },
    );
    return requireItems("百度", parseBaidu(html));
  },
};
