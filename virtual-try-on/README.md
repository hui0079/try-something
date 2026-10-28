# 试衣间

上传一张人物正面全身照和一张衣物图，调用阿里云百炼 AI试衣（`aitryon`）生成试穿效果。

## 准备 API Key

1. 用实名阿里云账号打开 [百炼控制台](https://bailian.console.aliyun.com/)
2. 右上角地域选 **华北2（北京）**
3. 在 API Key / 密钥管理里创建 Key，权限选全部
4. 复制到本地环境文件：

```bash
copy .env.local .env.local
```

把 `DASHSCOPE_API_KEY=` 后面填上 `sk-` 开头的密钥。不要把 Key 提交到 git。

新用户大约有 400 张免费额度，超出后约 0.20 元/张。新加坡等海外地域的 Key 不能用。

## 本地运行

建议 Node.js 22.13 或更高 LTS。当前仓库在 Node 23 也能跑测试。

```bash
cd virtual-try-on
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 怎么用

- 人物照：单人、正面全身、手不要挡住衣服
- 衣物照：单件平铺、背景干净
- 类型选上衣、下装或连衣裙
- 点「开始试衣」，通常要等 15–40 秒

只换上衣时，模型有可能重绘下装，这是百炼接口的行为。

## 测试

```bash
npm test
```
