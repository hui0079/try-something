# 聚落编年史

一个文字聚落模拟沙盒。你是这片土地的气候与命运，不是村长：能下雨、能挖渠、能放一群鹿、能送来一个陌生人，但没法命令任何人做任何事。推进时间，看居民自己的选择把聚落带向繁荣、分裂还是消亡，编年史会把过程写下来。

## 本地运行

建议使用 Node.js 22.13 或更高的 LTS 版本。

```bash
npm install
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)。全部计算在浏览器里完成，没有后端，也不需要任何密钥。

生产模式：

```bash
npm run build
npm start
```

## 怎么玩

- 顶栏推进时间：1 天 / 10 天 / 1 季 / 1 年，或者打开「自动」让日子自己走。
- 左侧「地土」是七个地块的食物、水、木石、盐与肥力，以及彼此之间通了渠还是通了路。
- 干预按钮各有影响力标价，影响力每天少量回复。需要指定地点的干预（开渠、修路、放鹿等）要先点按钮，再在地土面板里点选地块。
- 编年史可以按事件轻重和地点过滤。点任何人的名字进他的生平页，看他这一生都经历了什么。
- 世界会自动存进 localStorage。「分享」复制一条带种子的链接，对方打开就是同一个世界的开局；「导出 / 导入」走 JSON 文件，存的是当前这一刻的完整状态。

## 设计约束

- **模拟内核是纯函数。** `advance(world, days)` 不碰网络、不读时钟，随机数全部走 seeded PRNG。同一个种子加同一串干预，得到逐字节相同的世界，所以 bug 可复现，平衡也能用测试回归。
- **叙述层只读事件，绝不写状态。** 引擎吐结构化事件，叙述器把事件渲染成中文。
- **每条正反馈都配一条负反馈。** 干旱压低水位、水位压低产出、饥饿压低健康、健康压低劳力，这条链会崩；饥饿同时把人推向狩猎采集，死亡和出走又抬高人均资源，这两条把它拉回来。数值都在 `src/lib/sim/systems/` 各自的模块里。

## 目录

```
src/lib/sim/          纯模拟内核（rng / world / tick / decide / intervene / events）
src/lib/sim/systems/  weather · resources · actions · metabolism · social · population · hazards
src/lib/chronicle/    事件到中文编年史（templates / render / provider / biography）
src/components/       界面与 useColony 状态钩子
```

## 接 LLM 叙述

叙述层是一个 provider 接口：

```ts
type NarrationProvider = {
  id: string;
  label: string;
  narrate(events: readonly SimEvent[], options?: RenderOptions):
    ChronicleEntry[] | Promise<ChronicleEntry[]>;
};
```

默认实现是模板加同义词表，同步返回，写在 `src/lib/chronicle/provider.ts`。想换成模型叙述，实现一个返回 Promise 的 provider 传给 `useColony({ provider })` 即可，界面会在等待期间显示叙述中，过期的回答不会覆盖新的。模型只负责把事件列表重写成段落，世界状态始终由内核持有。

## 质量检查

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

测试里除了各模块的单元测试，还有三类回归：`balance.test.ts` 多种子长跑检查人口既不归零也不爆炸，`arc.test.ts` 检查几十年里生育、死亡、械斗、迁徙确实发生过，`noise.test.ts` 检查编年史不会把同一句话反复写出来。
