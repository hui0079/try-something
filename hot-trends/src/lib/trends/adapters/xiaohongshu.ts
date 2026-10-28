import { formatCount, isRecord } from "../format";
import { fetchText } from "../http";
import type { TrendAdapter, TrendItem } from "../types";
import { requireItems } from "./shared";

const INITIAL_STATE_MARKER = "window.__INITIAL_STATE__=";

function parseLikeCount(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : undefined;
  }
  if (typeof value !== "string") {
    return undefined;
  }

  const match = value
    .trim()
    .replaceAll(",", "")
    .replace(/\+$/, "")
    .match(/^(\d+(?:\.\d+)?)\s*(万|亿)?$/);
  if (!match) {
    return undefined;
  }

  const count = Number(match[1]);
  const multiplier = match[2] === "亿" ? 100_000_000 : match[2] === "万" ? 10_000 : 1;
  return count * multiplier;
}

function extractInitialState(html: string): unknown {
  const start = html.indexOf(INITIAL_STATE_MARKER);
  if (start < 0) {
    return undefined;
  }

  const valueStart = start + INITIAL_STATE_MARKER.length;
  const end = html.indexOf("</script>", valueStart);
  if (end < 0) {
    return undefined;
  }

  try {
    const json = html
      .slice(valueStart, end)
      .replace(/([:[,]\s*)undefined(?=\s*[,}\]])/g, "$1null");
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}

function parseHotSearchHtml(html: string): TrendItem[] {
  const table = html.match(/id="hot-list"[\s\S]*?<\/tbody>/i)?.[0];
  if (!table) {
    return [];
  }

  return [...table.matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<span class="b">([^<]+)<\/span>/gi)]
    .flatMap((match): TrendItem[] => {
      const title = match[2]?.trim();
      const href = match[1]?.replaceAll("&amp;", "&");
      if (!title || !href) {
        return [];
      }

      const url = href.startsWith("http")
        ? href
        : `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(title)}`;
      const metricValue = formatCount(parseLikeCount(match[3]));

      return [
        {
          rank: 0,
          title,
          url,
          ...(metricValue ? { metricLabel: "热度", metricValue } : {}),
        },
      ];
    })
    .slice(0, 10)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

function parseExploreState(html: string): TrendItem[] {
  const state = extractInitialState(html);
  if (!isRecord(state) || !isRecord(state.feed) || !Array.isArray(state.feed.feeds)) {
    return [];
  }

  return state.feed.feeds
    .flatMap((entry) => {
      if (
        !isRecord(entry) ||
        typeof entry.id !== "string" ||
        !isRecord(entry.noteCard) ||
        typeof entry.noteCard.displayTitle !== "string"
      ) {
        return [];
      }

      const title = entry.noteCard.displayTitle.trim();
      if (!title) {
        return [];
      }

      const interactInfo = isRecord(entry.noteCard.interactInfo)
        ? entry.noteCard.interactInfo
        : undefined;
      const likeCount = parseLikeCount(interactInfo?.likedCount);
      const xsecToken =
        typeof entry.xsecToken === "string" ? entry.xsecToken : undefined;
      const query = xsecToken
        ? `?xsec_token=${encodeURIComponent(xsecToken)}&xsec_source=pc_feed`
        : "";

      return [
        {
          id: entry.id,
          likeCount: likeCount ?? -1,
          item: {
            rank: 0,
            title,
            url: `https://www.xiaohongshu.com/explore/${entry.id}${query}`,
            ...(likeCount === undefined
              ? {}
              : {
                  metricLabel: "点赞",
                  metricValue: formatCount(likeCount),
                }),
          } satisfies TrendItem,
        },
      ];
    })
    .sort((left, right) => right.likeCount - left.likeCount)
    .slice(0, 10)
    .map(({ item }, index) => ({ ...item, rank: index + 1 }));
}

export function parseXiaohongshu(html: string): TrendItem[] {
  const exploreItems = parseExploreState(html);
  return exploreItems.length > 0 ? exploreItems : parseHotSearchHtml(html);
}

export const xiaohongshuAdapter: TrendAdapter = {
  id: "xiaohongshu",
  name: "小红书",
  async fetch() {
    const html = await fetchText("https://www.xiaohongshu.com/explore", {
      referer: "https://www.xiaohongshu.com/",
    });
    const exploreItems = parseXiaohongshu(html);
    if (exploreItems.length > 0) {
      return exploreItems;
    }

    const hotSearchHtml = await fetchText(
      "https://www.46.la/tool/xiaohongshu-hot",
      { referer: "https://www.46.la/" },
    );
    return requireItems("小红书", parseXiaohongshu(hotSearchHtml));
  },
};
