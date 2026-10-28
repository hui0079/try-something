import { flattenCharacterForVideo } from "./gif-demo";
import { convertMp4ToGif } from "./gif-convert";
import {
  MOTION_NEGATIVE_PROMPT,
  buildMotionPrompt,
} from "./expression-prompts";
import { generateImageToVideo } from "./video-provider";

export class VariantError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "VariantError";
    this.status = status;
  }
}

function parseDataUrl(dataUrl: string): Buffer {
  const match = /^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/.exec(
    dataUrl.trim(),
  );
  if (!match?.[1]) {
    throw new VariantError("定妆图格式无效，请重新生成");
  }
  return Buffer.from(match[1], "base64");
}

export async function runExpressionVariant(input: {
  apiKey: string;
  characterBase64: string;
  caption: string;
  index: number;
  i2vModel?: string;
}): Promise<{
  index: number;
  caption: string;
  imageBase64: string;
  expressionHint: string;
}> {
  const caption = input.caption.trim();
  if (!caption || caption.length > 8) {
    throw new VariantError("文案无效（1–8 字）");
  }
  if (
    typeof input.characterBase64 !== "string" ||
    !input.characterBase64.trim()
  ) {
    throw new VariantError("缺少定妆图，请先生成定妆");
  }

  const apiKey = input.apiKey.trim();
  if (!apiKey) {
    throw new VariantError(
      "未配置 DASHSCOPE_API_KEY，请在 .env.local 中填写北京地域的 Key",
      500,
    );
  }

  const expressionHint = buildMotionPrompt(caption);

  try {
    const character = parseDataUrl(input.characterBase64);
    const { dataUrl } = await flattenCharacterForVideo(character);
    const mp4 = await generateImageToVideo(
      { apiKey, i2vModel: input.i2vModel },
      {
        imgUrl: dataUrl,
        prompt: expressionHint,
        duration: 3,
        resolution: "480P",
        negativePrompt: MOTION_NEGATIVE_PROMPT,
      },
    );
    const gif = await convertMp4ToGif(mp4, { caption });
    return {
      index: input.index,
      caption,
      imageBase64: `data:image/gif;base64,${gif.toString("base64")}`,
      expressionHint,
    };
  } catch (error) {
    if (error instanceof VariantError) {
      throw error;
    }
    const message =
      error instanceof Error ? error.message : "表情动图生成失败，请稍后重试";
    const status = message.includes("未配置") ? 500 : 502;
    throw new VariantError(message, status);
  }
}
