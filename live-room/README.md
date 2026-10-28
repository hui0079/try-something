# 试播间

本机用 Node 收一路 RTMP，浏览器看画面、发聊天。观众只打开网页；桌面 Chrome / Edge 走 HTTP-FLV，Safari、iOS 和微信走 HLS。

## 启动

```bash
cd live-room
npm install
npm run dev
```

`npm run dev` 会同时打开页面、聊天，以及本机的 RTMP（1935）和播放（8000）服务。浏览器打开 Vite 打印的本地地址（默认 `http://127.0.0.1:5173`）。同一局域网的人用 Network 那一行里的 IP 打开同一端口即可。

## 开播

OBS：

- 服务：自定义
- 服务器：`rtmp://127.0.0.1/live`
- 串流密钥：`room`
- 分辨率：1280x720
- 视频码率：2500 kbps
- 关键帧间隔：2 秒

没有 OBS 时，可以用 ffmpeg 推一条彩条：

```bash
ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=30 -f lavfi -i sine=frequency=1000:sample_rate=44100 -c:v libx264 -preset veryfast -tune zerolatency -g 60 -keyint_min 60 -sc_threshold 0 -b:v 2500k -c:a aac -ar 44100 -f flv rtmp://127.0.0.1/live/room
```

停掉推流后，页面回到「主播还没开播」，再次推流会自己接上。

## 以后换云

播放页认的是 `/media/live/room.flv` 和 `/media/live/room/index.m3u8`。换腾讯云或阿里云时，把推流地址和 Vite 的 `/media` 反代目标换成云厂商的播放域名即可，房间页面不用改。
