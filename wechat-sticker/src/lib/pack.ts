import { buildStickerZip } from "./pack-zip";

export class PackError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "PackError";
    this.status = status;
  }
}

function parseDataUrl(dataUrl: string): Buffer {
  const match = /^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/.exec(
    dataUrl.trim(),
  );
  if (!match?.[1]) {
    throw new PackError("贴纸图片格式无效");
  }
  return Buffer.from(match[1], "base64");
}

export type PackStickerInput = {
  caption?: string;
  imageBase64: string;
  index?: number;
};

/**
 * Zip already-composed sticker PNGs (from /api/variant).
 * No AI calls here — generation happens per-variant for progress UX.
 */
export async function runPackExport(input: {
  stickers: unknown;
}): Promise<Buffer> {
  if (!Array.isArray(input.stickers) || input.stickers.length === 0) {
    throw new PackError("没有可打包的贴纸，请先生成表情");
  }
  if (input.stickers.length > 8) {
    throw new PackError("一次最多打包 8 张");
  }

  const files: { filename: string; buffer: Buffer }[] = [];
  for (let i = 0; i < input.stickers.length; i++) {
    const item = input.stickers[i] as PackStickerInput;
    if (!item || typeof item.imageBase64 !== "string") {
      throw new PackError(`第 ${i + 1} 张贴纸无效`);
    }
    const caption =
      typeof item.caption === "string" && item.caption.trim()
        ? item.caption.trim()
        : `sticker-${i + 1}`;
    const safeName = caption.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 16);
    const ext = item.imageBase64.startsWith("data:image/gif") ? "gif" : "png";
    files.push({
      filename: `${String(i + 1).padStart(2, "0")}-${safeName}.${ext}`,
      buffer: parseDataUrl(item.imageBase64),
    });
  }

  return buildStickerZip(files);
}
