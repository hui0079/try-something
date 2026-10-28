# 微信表情包生成器

AI 定妆角色后，按每条文案生成表情动图（GIF），导出微信可用的 240×240 循环 GIF 压缩包。也支持定妆后单独试做 1 张 GIF。

## 准备 API Key

1. 用实名阿里云账号打开 [百炼控制台](https://bailian.console.aliyun.com/)
2. 右上角地域选 **华北2（北京）**
3. 在 API Key / 密钥管理里创建 Key，并开通**通义万相**文生图与**图生视频**
4. 复制到本地环境文件：

```bash
copy .env.local .env.local
```

把 `DASHSCOPE_API_KEY=` 后面填上 `sk-` 开头的密钥。不要把 Key 提交到 git。

- 定妆默认：`wanx2.1-t2i-turbo`（可用 `IMAGE_T2I_MODEL` 覆盖）
- 表情动图默认：`wanx2.1-i2v-turbo`（北京地域；可用 `IMAGE_I2V_MODEL` 覆盖），约 3 秒 / 480P，再转 240 GIF。若报 Model not exist，请到模型广场开通该模型。

## 本地运行

建议 Node.js 22.13 或更高 LTS。`ffmpeg-static` 会随依赖安装，无需本机单独装 ffmpeg。

```bash
cd wechat-sticker
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 怎么用

1. **定妆**：填写角色描述（可选上传参考图）→ 生成定妆图  
2. **（可选）试做动图**：定妆成功后点「试做动图 GIF」——图生视频再转循环 GIF（通常 1–3 分钟，按次计费）→ 预览并下载 `sticker.gif`  
3. **文案**：编辑 8 条短文案（每条不超过 8 字）  
4. **动图**：点击「生成表情动图」——每条文案用定妆图做首帧出一段短视频并转 GIF（每张约 1–3 分钟）  
5. **下载**：把已成功的 GIF 打成 `stickers.zip`

下载后可在微信里通过「自定义表情」添加。本工具不做官方表情商店上架包。

## 测试

```bash
npm test
```
