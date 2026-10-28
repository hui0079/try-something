import { afterEach, describe, expect, it, vi } from "vitest";

import { baiduAdapter } from "../baidu";
import { bilibiliAdapter } from "../bilibili";
import { douyinAdapter } from "../douyin";
import { hupuAdapter } from "../hupu";
import { toutiaoAdapter } from "../toutiao";
import { weiboAdapter } from "../weibo";
import { xiaohongshuAdapter } from "../xiaohongshu";
import { zhihuAdapter } from "../zhihu";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("platform fetchers", () => {
  it("uses the accessible Zhihu API host", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              target: {
                title: "知乎热点",
                url: "https://www.zhihu.com/question/1",
              },
              detail_text: "100 万热度",
            },
          ],
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await zhihuAdapter.fetch();

    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.zhihu.com/topstory/hot-lists/total?limit=10",
    );
  });

  it.each([
    [zhihuAdapter, "zhihu.com", { data: [] }],
    [weiboAdapter, "weibo.com", { data: { realtime: [] } }],
    [bilibiliAdapter, "bilibili.com", { data: { list: [] } }],
    [douyinAdapter, "douyin.com", { data: { word_list: [] } }],
    [hupuAdapter, "m.hupu.com", { data: { topicThreads: [] } }],
    [toutiaoAdapter, "toutiao.com", { data: [] }],
  ])("rejects empty %s responses", async (adapter, host, payload) => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(payload)));
    vi.stubGlobal("fetch", fetchMock);

    await expect(adapter.fetch()).rejects.toThrow("没有可展示的数据");
    expect(fetchMock.mock.calls[0][0]).toContain(host);
  });

  it("rejects Xiaohongshu when explore and hot-search pages are both empty", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("<html></html>"))
      .mockResolvedValueOnce(new Response("<html></html>"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(xiaohongshuAdapter.fetch()).rejects.toThrow("没有可展示的数据");
    expect(fetchMock.mock.calls[0][0]).toContain("xiaohongshu.com");
    expect(fetchMock.mock.calls[1][0]).toContain("46.la");
  });

  it("falls back to the public Xiaohongshu hot-search page when explore SSR is empty", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          `<script>window.__INITIAL_STATE__=${JSON.stringify({
            feed: { feeds: [] },
          })}</script>`,
        ),
      )
      .mockResolvedValueOnce(
        new Response(`
          <tbody id="hot-list">
            <tr>
              <td>1</td>
              <td><a href="https://www.xiaohongshu.com/search_result?keyword=fallback">回退热搜</a></td>
              <td><span class="b">12.3万</span></td>
            </tr>
          </tbody>
        `),
      );
    vi.stubGlobal("fetch", fetchMock);

    const items = await xiaohongshuAdapter.fetch();

    expect(fetchMock.mock.calls[0][0]).toContain("xiaohongshu.com/explore");
    expect(fetchMock.mock.calls[1][0]).toContain("46.la/tool/xiaohongshu-hot");
    expect(items[0]).toMatchObject({
      title: "回退热搜",
      metricLabel: "热度",
      metricValue: "12.3 万",
    });
  });

  it("requests and validates the Baidu board HTML", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("<html>empty</html>"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(baiduAdapter.fetch()).rejects.toThrow("没有可展示的数据");
    expect(fetchMock.mock.calls[0][0]).toContain("top.baidu.com");
  });
});
