# 热浪：多平台实时热榜

一个本地优先的热榜仪表盘，聚合知乎、微博、哔哩哔哩、百度、抖音、虎扑、今日头条和小红书的前十条热门内容。页面支持手动刷新，并每 30 分钟自动更新。

## 本地运行

建议使用 Node.js 22.13 或更高的 LTS 版本。

```bash
npm install
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)。

生产模式：

```bash
npm run build
npm start
```

## 刷新与缓存

- 页面首次打开时请求 `/api/trends`。
- 点击“立即刷新”会请求 `/api/trends?refresh=1`，绕过应用缓存。
- 手动刷新完成后会显示可用平台数量和秒级更新时间。
- 单个平台的重试会额外传入 `platform` 参数，只刷新对应平台。
- 浏览器每 30 分钟自动请求一次。
- 服务端按平台保存 30 分钟内存缓存，并合并同时发生的重复请求。
- 刷新失败但存在历史结果时，继续返回上次成功数据并标记为“旧数据”。
- 内存缓存不会持久化，开发服务器重启、生产进程重启或多实例切换后都会丢失。在线人数和今日访问也保存在同一进程内存中：在线表示最近 1 分钟内仍在心跳的独立浏览器，今日访问按上海时区统计当天独立访客，重启后从零开始。

## 数据源

- 知乎：`api.zhihu.com/topstory/hot-lists/total`
- 微博：`weibo.com/ajax/side/hotSearch`
- 哔哩哔哩：`api.bilibili.com/x/web-interface/popular`
- 百度：`top.baidu.com/board?tab=realtime`
- 抖音：`www.douyin.com/aweme/v1/web/hot/search/list/`
- 虎扑：`m.hupu.com/api/v2/bbs/topicThreads?topicId=1&page=1`
- 今日头条：`www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc`
- 小红书：优先 `www.xiaohongshu.com/explore` 公开首屏；若首屏不再内嵌笔记，则回退到公开热搜页并按热度取前十

这些入口来自各平台公开网页或网页端接口，并不都是有稳定性承诺的开放 API。平台可能随时调整响应结构、要求登录或启用风控。应用会隔离单个平台故障，但不能保证每个平台始终可用，也不应将它用于高频抓取。

2026-08-25 的本地实时冒烟验证中，八个平台均成功返回 10 条数据。知乎已从返回 401 的旧网页端地址切换到当前可访问的 `api.zhihu.com`；虎扑解析同时兼容数字和字符串帖子 ID；小红书使用发现页首屏公开数据，页面结构变化时可能暂时不可用。

## 质量检查

```bash
npm test
npm run lint
npm run build
```

自动化测试使用固定响应数据，不依赖实时上游服务；实时可用性需另外通过本地页面或 `/api/trends?refresh=1` 验证。

## 后续部署

项目可以部署到常驻 Node.js 服务器或 Docker。若部署到多实例或 Serverless 环境，建议把内存缓存替换为 Redis 等共享缓存，否则不同实例会各自抓取上游数据。
