import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./gif-demo", () => ({
  flattenCharacterForVideo: vi.fn(async () => ({
    dataUrl: "data:image/jpeg;base64,aa",
    jpeg: Buffer.from([1]),
  })),
}));

vi.mock("./gif-convert", () => ({
  convertMp4ToGif: vi.fn(async () => Buffer.from("GIF89a")),
}));

vi.mock("./video-provider", () => ({
  generateImageToVideo: vi.fn(async () => Buffer.from([9])),
}));

import { convertMp4ToGif } from "./gif-convert";
import { generateImageToVideo } from "./video-provider";
import { VariantError, runExpressionVariant } from "./variant";

describe("runExpressionVariant", () => {
  beforeEach(() => {
    vi.mocked(generateImageToVideo).mockClear();
    vi.mocked(convertMp4ToGif).mockClear();
  });

  it("rejects empty caption", async () => {
    await expect(
      runExpressionVariant({
        apiKey: "sk",
        characterBase64: "data:image/png;base64,aa",
        caption: "  ",
        index: 0,
      }),
    ).rejects.toBeInstanceOf(VariantError);
  });

  it("rejects missing character image", async () => {
    await expect(
      runExpressionVariant({
        apiKey: "sk",
        characterBase64: "",
        caption: "好的",
        index: 0,
      }),
    ).rejects.toThrow(/定妆图/);
  });

  it("animates the character still into a captioned gif", async () => {
    const png = await sharp({
      create: {
        width: 16,
        height: 16,
        channels: 3,
        background: { r: 255, g: 128, b: 0 },
      },
    })
      .png()
      .toBuffer();

    const result = await runExpressionVariant({
      apiKey: "sk-test",
      characterBase64: `data:image/png;base64,${png.toString("base64")}`,
      caption: "好的",
      index: 0,
    });

    expect(result.imageBase64.startsWith("data:image/gif;base64,")).toBe(true);
    expect(generateImageToVideo).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        prompt: expect.stringContaining("纯白亮底"),
        negativePrompt: expect.stringContaining("黑色背景"),
        duration: 3,
      }),
    );
    expect(convertMp4ToGif).toHaveBeenCalledWith(expect.any(Buffer), {
      caption: "好的",
    });
  });
});
