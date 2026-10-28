import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./video-provider", () => ({
  GIF_DEMO_MOTION_PROMPT: "点头挥手",
  generateImageToVideo: vi.fn(),
}));

vi.mock("./gif-convert", () => ({
  convertMp4ToGif: vi.fn(),
}));

import { convertMp4ToGif } from "./gif-convert";
import { generateImageToVideo } from "./video-provider";
import {
  GifDemoError,
  flattenCharacterForVideo,
  runGifDemo,
} from "./gif-demo";

describe("flattenCharacterForVideo", () => {
  it("outputs opaque jpeg data url", async () => {
    const png = await sharp({
      create: {
        width: 32,
        height: 32,
        channels: 4,
        background: { r: 255, g: 100, b: 50, alpha: 0.5 },
      },
    })
      .png()
      .toBuffer();
    const { dataUrl, jpeg } = await flattenCharacterForVideo(png);
    expect(dataUrl.startsWith("data:image/jpeg;base64,")).toBe(true);
    expect(jpeg.length).toBeGreaterThan(0);
  });
});

describe("runGifDemo", () => {
  beforeEach(() => {
    vi.mocked(generateImageToVideo).mockReset();
    vi.mocked(convertMp4ToGif).mockReset();
  });

  it("rejects missing character", async () => {
    await expect(
      runGifDemo({ apiKey: "sk", characterBase64: "" }),
    ).rejects.toBeInstanceOf(GifDemoError);
  });

  it("flattens, calls i2v, converts gif", async () => {
    const png = await sharp({
      create: {
        width: 24,
        height: 24,
        channels: 3,
        background: { r: 10, g: 20, b: 30 },
      },
    })
      .png()
      .toBuffer();
    vi.mocked(generateImageToVideo).mockResolvedValue(Buffer.from([1, 2, 3]));
    vi.mocked(convertMp4ToGif).mockResolvedValue(Buffer.from([71, 73, 70]));

    const result = await runGifDemo({
      apiKey: "sk-test",
      characterBase64: `data:image/png;base64,${png.toString("base64")}`,
    });
    expect(result.gifBase64.startsWith("data:image/gif;base64,")).toBe(true);
    expect(generateImageToVideo).toHaveBeenCalled();
    expect(convertMp4ToGif).toHaveBeenCalled();
  });
});
