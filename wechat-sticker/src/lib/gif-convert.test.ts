import { describe, expect, it } from "vitest";

import { convertMp4ToGif, resolveFfmpegPath } from "./gif-convert";

describe("gif-convert", () => {
  it("resolves ffmpeg-static path", () => {
    expect(resolveFfmpegPath().length).toBeGreaterThan(0);
  });

  it("rejects empty mp4 buffer", async () => {
    await expect(convertMp4ToGif(Buffer.alloc(0))).rejects.toThrow(/为空/);
  });
});
