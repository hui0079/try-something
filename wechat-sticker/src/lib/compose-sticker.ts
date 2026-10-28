import sharp from "sharp";

import type { StickerTemplate } from "./sticker-templates";
import { STICKER_SIZE } from "./validate";

export type ComposeOptions = {
  size?: number;
  removeWhiteBackground?: boolean;
};

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildAccentSvg(size: number, color: string): Buffer {
  const cx = size / 2;
  const cy = size * 0.42;
  const r = size * 0.34;
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>
</svg>`;
  return Buffer.from(svg);
}

export function buildCaptionSvg(
  size: number,
  caption: string,
  fill: string,
  stroke: string,
): Buffer {
  const fontSize = caption.length <= 3 ? Math.round(size * 0.18) : Math.round(size * 0.14);
  const y = Math.round(size * 0.9);
  const text = escapeXml(caption);
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .cap {
      font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans SC", "Segoe UI", sans-serif;
      font-weight: 700;
      font-size: ${fontSize}px;
    }
  </style>
  <text class="cap" x="50%" y="${y}" text-anchor="middle"
    fill="${fill}" stroke="${stroke}" stroke-width="${Math.max(4, Math.round(size * 0.035))}"
    paint-order="stroke fill">${text}</text>
</svg>`;
  return Buffer.from(svg);
}

/** Turn near-white pixels into transparent for sticker cutout. */
export async function removeNearWhiteBackground(
  input: Buffer,
  threshold = 245,
): Promise<Buffer> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    if (r >= threshold && g >= threshold && b >= threshold) {
      data[i + 3] = 0;
    }
  }

  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
}

export async function prepareCharacterBuffer(
  input: Buffer,
  options: ComposeOptions = {},
): Promise<Buffer> {
  const size = options.size ?? STICKER_SIZE;
  let buffer = await sharp(input)
    .rotate()
    .resize(size, size, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();

  if (options.removeWhiteBackground !== false) {
    buffer = Buffer.from(await removeNearWhiteBackground(buffer));
  }
  return buffer;
}

export async function composeSticker(
  characterPng: Buffer,
  template: StickerTemplate,
  options: ComposeOptions = {},
): Promise<Buffer> {
  const size = options.size ?? STICKER_SIZE;
  const prepared = await prepareCharacterBuffer(characterPng, {
    ...options,
    size,
  });

  const characterInset = Math.round(size * 0.12);
  const characterSize = size - characterInset * 2;

  const resizedCharacter = await sharp(prepared)
    .resize(characterSize, characterSize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: buildAccentSvg(size, template.accent),
        top: 0,
        left: 0,
      },
      {
        input: resizedCharacter,
        top: Math.round(size * 0.06),
        left: characterInset,
      },
      {
        input: buildCaptionSvg(
          size,
          template.caption,
          template.textFill,
          template.textStroke,
        ),
        top: 0,
        left: 0,
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

export async function composePack(
  characterPng: Buffer,
  templates: StickerTemplate[],
  options: ComposeOptions = {},
): Promise<{ filename: string; buffer: Buffer }[]> {
  const results: { filename: string; buffer: Buffer }[] = [];
  for (const template of templates) {
    const buffer = await composeSticker(characterPng, template, options);
    results.push({
      filename: `${template.id}.png`,
      buffer,
    });
  }
  return results;
}
