import sharp from "sharp";
import { describe, expect, it } from "vitest";

import {
  composePack,
  composeSticker,
  removeNearWhiteBackground,
} from "./compose-sticker";
import { DEFAULT_TEMPLATES } from "./sticker-templates";

async function solidCharacter(): Promise<Buffer> {
  return sharp({
    create: {
      width: 200,
      height: 200,
      channels: 3,
      background: { r: 255, g: 140, b: 60 },
    },
  })
    .png()
    .toBuffer();
}

describe("compose-sticker", () => {
  it("removes near-white pixels", async () => {
    const white = await sharp({
      create: {
        width: 10,
        height: 10,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .png()
      .toBuffer();

    const cut = await removeNearWhiteBackground(white);
    const { data } = await sharp(cut)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(data[3]).toBe(0);
  });

  it("composes a 240png sticker", async () => {
    const character = await solidCharacter();
    const sticker = await composeSticker(character, DEFAULT_TEMPLATES[0]!);
    const meta = await sharp(sticker).metadata();
    expect(meta.width).toBe(240);
    expect(meta.height).toBe(240);
    expect(meta.format).toBe("png");
    expect(meta.hasAlpha).toBe(true);
  });

  it("composes a full pack", async () => {
    const character = await solidCharacter();
    const pack = await composePack(character, DEFAULT_TEMPLATES.slice(0, 3));
    expect(pack).toHaveLength(3);
    expect(pack[0]?.filename).toMatch(/\.png$/);
  });
});
