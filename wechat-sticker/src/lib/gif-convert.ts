import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import ffmpegPath from "ffmpeg-static";

const GIF_SIZE = 240;
const GIF_FPS = 12;

export function resolveFfmpegPath(): string {
  if (!ffmpegPath) {
    throw new Error("未找到 ffmpeg-static 可执行文件，请重新 npm install");
  }
  return ffmpegPath;
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const bin = resolveFfmpegPath();
    const child = spawn(bin, args, { windowsHide: true });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      reject(error);
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`ffmpeg 转码失败（code=${code}）：${stderr.slice(-500)}`));
    });
  });
}

const FONT_CANDIDATES = [
  "C:/Windows/Fonts/msyhbd.ttc",
  "C:/Windows/Fonts/msyh.ttc",
  "C:/Windows/Fonts/simhei.ttf",
  "/System/Library/Fonts/PingFang.ttc",
  "/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc",
];

export function resolveCaptionFont(): string | null {
  return FONT_CANDIDATES.find((path) => existsSync(path)) ?? null;
}

function escapeDrawtext(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/%/g, "\\%");
}

function captionFilter(caption: string): string {
  const font = resolveCaptionFont();
  const text = caption.trim();
  if (!font || !text) {
    return "";
  }
  const fontFile = font.replace(/\\/g, "/").replace(":", "\\:");
  return `,drawtext=fontfile='${fontFile}':text='${escapeDrawtext(text)}':fontsize=36:fontcolor=black:borderw=4:bordercolor=white:x=(w-text_w)/2:y=h-52`;
}

/**
 * Convert an MP4 buffer into a looping 240×240 GIF suitable for sticker demos.
 * Optional caption is burned in with ffmpeg drawtext when a CJK font exists.
 */
export async function convertMp4ToGif(
  mp4: Buffer,
  options: { caption?: string } = {},
): Promise<Buffer> {
  if (!mp4.length) {
    throw new Error("视频内容为空，无法转 GIF");
  }

  const dir = await mkdtemp(join(tmpdir(), "sticker-gif-"));
  const inputPath = join(dir, "in.mp4");
  const palettePath = join(dir, "palette.png");
  const outputPath = join(dir, "out.gif");

  try {
    await writeFile(inputPath, mp4);

    const scalePad = `scale=${GIF_SIZE}:${GIF_SIZE}:force_original_aspect_ratio=decrease,pad=${GIF_SIZE}:${GIF_SIZE}:(ow-iw)/2:(oh-ih)/2:white,fps=${GIF_FPS}${captionFilter(options.caption ?? "")}`;

    await runFfmpeg([
      "-y",
      "-i",
      inputPath,
      "-vf",
      `${scalePad},palettegen=stats_mode=diff`,
      palettePath,
    ]);

    await runFfmpeg([
      "-y",
      "-i",
      inputPath,
      "-i",
      palettePath,
      "-lavfi",
      `${scalePad}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5`,
      "-loop",
      "0",
      outputPath,
    ]);

    return await readFile(outputPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
