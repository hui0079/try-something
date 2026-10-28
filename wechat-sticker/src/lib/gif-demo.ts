import sharp from "sharp";

import { convertMp4ToGif } from "./gif-convert";
import {
  GIF_DEMO_MOTION_PROMPT,
  generateImageToVideo,
} from "./video-provider";

export class GifDemoError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "GifDemoError";
    this.status = status;
  }
}

function parseDataUrl(dataUrl: string): Buffer {
  const match = /^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/.exec(
    dataUrl.trim(),
  );
  if (!match?.[1]) {
    throw new GifDemoError("定妆图格式无效，请重新生成");
  }
  return Buffer.from(match[1], "base64");
}

/** Flatten alpha onto white and export JPEG for DashScope i2v (no alpha). */
export async function flattenCharacterForVideo(
  characterPng: Buffer,
): Promise<{ dataUrl: string; jpeg: Buffer }> {
  const jpeg = await sharp(characterPng)
    .rotate()
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .jpeg({ quality: 90 })
    .toBuffer();
  return {
    jpeg,
    dataUrl: `data:image/jpeg;base64,${jpeg.toString("base64")}`,
  };
}

export async function runGifDemo(input: {
  apiKey: string;
  characterBase64: string;
  i2vModel?: string;
  motionPrompt?: string;
}): Promise<{ gifBase64: string }> {
  if (
    typeof input.characterBase64 !== "string" ||
    !input.characterBase64.trim()
  ) {
    throw new GifDemoError("缺少定妆图，请先生成定妆");
  }

  const apiKey = input.apiKey.trim();
  if (!apiKey) {
    throw new GifDemoError(
      "未配置 DASHSCOPE_API_KEY，请在 .env.local 中填写北京地域的 Key",
      500,
    );
  }

  try {
    const character = parseDataUrl(input.characterBase64);
    const { dataUrl } = await flattenCharacterForVideo(character);
    const mp4 = await generateImageToVideo(
      { apiKey, i2vModel: input.i2vModel },
      {
        imgUrl: dataUrl,
        prompt: input.motionPrompt ?? GIF_DEMO_MOTION_PROMPT,
        duration: 3,
        resolution: "480P",
      },
    );
    const gif = await convertMp4ToGif(mp4);
    return {
      gifBase64: `data:image/gif;base64,${gif.toString("base64")}`,
    };
  } catch (error) {
    if (error instanceof GifDemoError) {
      throw error;
    }
    const message =
      error instanceof Error ? error.message : "动图生成失败，请稍后重试";
    const status = message.includes("未配置") ? 500 : 502;
    throw new GifDemoError(message, status);
  }
}
