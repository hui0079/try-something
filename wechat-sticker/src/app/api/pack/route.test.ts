import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { POST } from "./route";

async function stickerDataUrl(): Promise<string> {
  const png = await sharp({
    create: {
      width: 64,
      height: 64,
      channels: 4,
      background: { r: 240, g: 120, b: 40, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

describe("POST /api/pack", () => {
  it("returns 400 when stickers missing", async () => {
    const response = await POST(
      new Request("http://localhost/api/pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stickers: [] }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("returns a zip for composed stickers", async () => {
    const imageBase64 = await stickerDataUrl();
    const response = await POST(
      new Request("http://localhost/api/pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stickers: [
            { caption: "好的", imageBase64 },
            { caption: "不行", imageBase64 },
          ],
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/zip");
    const bytes = Buffer.from(await response.arrayBuffer());
    expect(bytes.subarray(0, 2).toString("utf8")).toBe("PK");
  });
});
