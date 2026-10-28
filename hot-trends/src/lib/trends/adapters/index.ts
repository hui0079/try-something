import type { TrendAdapter } from "../types";
import { baiduAdapter } from "./baidu";
import { bilibiliAdapter } from "./bilibili";
import { douyinAdapter } from "./douyin";
import { hupuAdapter } from "./hupu";
import { toutiaoAdapter } from "./toutiao";
import { weiboAdapter } from "./weibo";
import { xiaohongshuAdapter } from "./xiaohongshu";
import { zhihuAdapter } from "./zhihu";

export const trendAdapters: TrendAdapter[] = [
  zhihuAdapter,
  weiboAdapter,
  bilibiliAdapter,
  baiduAdapter,
  douyinAdapter,
  hupuAdapter,
  toutiaoAdapter,
  xiaohongshuAdapter,
];
