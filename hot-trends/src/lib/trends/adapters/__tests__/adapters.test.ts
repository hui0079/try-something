import { describe, expect, it } from "vitest";

import { parseBaidu } from "../baidu";
import { parseBilibili } from "../bilibili";
import { parseDouyin } from "../douyin";
import { parseHupu } from "../hupu";
import { parseToutiao } from "../toutiao";
import { parseWeibo } from "../weibo";
import { parseXiaohongshu } from "../xiaohongshu";
import { parseZhihu } from "../zhihu";

describe("trend platform adapters", () => {
  it("normalizes Zhihu items and limits the result to ten", () => {
    const data = {
      data: Array.from({ length: 11 }, (_, index) => ({
        target: {
          title: `知乎话题 ${index + 1}`,
          url: `https://www.zhihu.com/question/${index + 1}`,
        },
        detail_text: `${100 - index} 万热度`,
      })),
    };

    expect(parseZhihu(data)).toHaveLength(10);
    expect(parseZhihu(data)[0]).toEqual({
      rank: 1,
      title: "知乎话题 1",
      url: "https://www.zhihu.com/question/1",
      metricLabel: "热度",
      metricValue: "100 万",
    });
  });

  it("normalizes Weibo realtime hot searches", () => {
    const data = {
      data: {
        realtime: [
          {
            word: "微博话题",
            num: 5230000,
            scheme: "https://s.weibo.com/weibo?q=%23%E5%BE%AE%E5%8D%9A%E8%AF%9D%E9%A2%98%23",
          },
        ],
      },
    };

    expect(parseWeibo(data)[0]).toEqual({
      rank: 1,
      title: "微博话题",
      url: data.data.realtime[0].scheme,
      metricLabel: "热度",
      metricValue: "523 万",
    });
  });

  it("normalizes Bilibili videos and view counts", () => {
    const data = {
      data: {
        list: [
          {
            title: "热门视频",
            bvid: "BV1example",
            stat: { view: 1289000 },
          },
        ],
      },
    };

    expect(parseBilibili(data)[0]).toEqual({
      rank: 1,
      title: "热门视频",
      url: "https://www.bilibili.com/video/BV1example",
      metricLabel: "播放",
      metricValue: "128.9 万",
    });
  });

  it("extracts Baidu structured data embedded in the board HTML", () => {
    const payload = {
      data: {
        cards: [
          {
            component: "hotList",
            content: [
              {
                word: "百度话题",
                rawUrl: "https://www.baidu.com/s?wd=%E7%99%BE%E5%BA%A6",
                hotScore: "4983021",
              },
            ],
          },
        ],
      },
    };
    const html = `<!doctype html><!--s-data:${JSON.stringify(payload)}-->`;

    expect(parseBaidu(html)[0]).toEqual({
      rank: 1,
      title: "百度话题",
      url: "https://www.baidu.com/s?wd=%E7%99%BE%E5%BA%A6",
      metricLabel: "热度",
      metricValue: "498.3 万",
    });
  });

  it("normalizes Douyin hot words and skips malformed entries", () => {
    const data = {
      data: {
        word_list: [
          { word: "", hot_value: 999 },
          { word: "抖音话题", hot_value: 9876543 },
        ],
      },
    };

    expect(parseDouyin(data)).toEqual([
      {
        rank: 1,
        title: "抖音话题",
        url: "https://www.douyin.com/search/%E6%8A%96%E9%9F%B3%E8%AF%9D%E9%A2%98",
        metricLabel: "热度",
        metricValue: "987.7 万",
      },
    ]);
  });

  it("normalizes Hupu main-street posts and reply counts", () => {
    const data = {
      data: {
        topicThreads: Array.from({ length: 11 }, (_, index) => ({
          tid: 1000 + index,
          title: `虎扑热帖 ${index + 1}`,
          replies: 321 - index,
          url: `https://m.hupu.com/bbs/${1000 + index}`,
        })),
      },
    };

    expect(parseHupu(data)).toHaveLength(10);
    expect(parseHupu(data)[0]).toEqual({
      rank: 1,
      title: "虎扑热帖 1",
      url: "https://bbs.hupu.com/1000.html",
      metricLabel: "回复",
      metricValue: "321",
    });
  });

  it("normalizes Toutiao hot-board entries and hot values", () => {
    const data = {
      data: [
        {
          ClusterIdStr: "987654",
          Title: "头条热点",
          HotValue: "7654321",
          Image: { url: "https://example.com/image.jpg" },
        },
      ],
    };

    expect(parseToutiao(data)[0]).toEqual({
      rank: 1,
      title: "头条热点",
      url: "https://www.toutiao.com/trending/987654/",
      metricLabel: "热度",
      metricValue: "765.4 万",
    });
  });

  it("sorts Xiaohongshu explore notes by likes and limits them to ten", () => {
    const feeds = Array.from({ length: 12 }, (_, index) => ({
      id: `note-${index + 1}`,
      xsecToken: `token-${index + 1}`,
      noteCard: {
        displayTitle: `小红书笔记 ${index + 1}`,
        interactInfo: {
          likedCount: index === 0 ? "1.5万" : String(20_000 - index * 1_000),
        },
      },
    }));
    const html = `<script>window.__INITIAL_STATE__=${JSON.stringify({
      feed: { feeds },
    })}</script>`;

    expect(parseXiaohongshu(html)).toHaveLength(10);
    expect(parseXiaohongshu(html)[0]).toEqual({
      rank: 1,
      title: "小红书笔记 2",
      url: "https://www.xiaohongshu.com/explore/note-2?xsec_token=token-2&xsec_source=pc_feed",
      metricLabel: "点赞",
      metricValue: "1.9 万",
    });
  });

  it("parses Xiaohongshu hot-search HTML when explore SSR has no notes", () => {
    const html = `
      <tbody id="hot-list">
        ${Array.from({ length: 11 }, (_, index) => `
          <tr>
            <td>${index + 1}</td>
            <td><a href="https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(`小红书热搜 ${index + 1}`)}&amp;type=51">小红书热搜 ${index + 1}</a></td>
            <td><span class="b">${90 - index}万</span></td>
          </tr>
        `).join("")}
      </tbody>
    `;

    expect(parseXiaohongshu(html)).toHaveLength(10);
    expect(parseXiaohongshu(html)[0]).toEqual({
      rank: 1,
      title: "小红书热搜 1",
      url: "https://www.xiaohongshu.com/search_result?keyword=%E5%B0%8F%E7%BA%A2%E4%B9%A6%E7%83%AD%E6%90%9C%201&type=51",
      metricLabel: "热度",
      metricValue: "90 万",
    });
  });

  it("returns an empty list when an upstream structure is missing", () => {
    expect(parseZhihu({})).toEqual([]);
    expect(parseWeibo(null)).toEqual([]);
    expect(parseBilibili({ data: {} })).toEqual([]);
    expect(parseBaidu("<html></html>")).toEqual([]);
    expect(parseDouyin({ status_code: 1 })).toEqual([]);
    expect(parseHupu({ data: {} })).toEqual([]);
    expect(parseToutiao({ data: null })).toEqual([]);
    expect(parseXiaohongshu("<html></html>")).toEqual([]);
  });
});
