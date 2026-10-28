import { describe, expect, it } from "vitest";

import { buildStickerZip } from "./pack-zip";

describe("buildStickerZip", () => {
  it("packs png buffers into a zip", async () => {
    const zip = await buildStickerZip([
      { filename: "a.png", buffer: Buffer.from([137, 80, 78, 71]) },
      { filename: "b.png", buffer: Buffer.from([137, 80, 78, 71]) },
    ]);
    expect(zip.subarray(0, 2).toString("utf8")).toBe("PK");
  });
});
