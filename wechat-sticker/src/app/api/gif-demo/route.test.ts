import { beforeEach, describe, expect, it, vi } from "vitest";

const { runGifDemo, GifDemoError } = vi.hoisted(() => {
  class GifDemoError extends Error {
    status: number;
    constructor(message: string, status = 400) {
      super(message);
      this.name = "GifDemoError";
      this.status = status;
    }
  }
  return {
    runGifDemo: vi.fn(),
    GifDemoError,
  };
});

vi.mock("@/lib/gif-demo", () => ({
  GifDemoError,
  runGifDemo,
}));

import { POST } from "./route";

describe("POST /api/gif-demo", () => {
  beforeEach(() => {
    runGifDemo.mockReset();
  });

  it("returns 400 on GifDemoError", async () => {
    runGifDemo.mockRejectedValue(new GifDemoError("缺少定妆图", 400));
    const response = await POST({
      json: async () => ({ characterBase64: "" }),
    } as Request);
    expect(response.status).toBe(400);
  });

  it("returns gif base64 on success", async () => {
    runGifDemo.mockResolvedValue({
      gifBase64: "data:image/gif;base64,R0lG",
    });
    const response = await POST({
      json: async () => ({
        characterBase64: "data:image/png;base64,aa",
      }),
    } as Request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      gifBase64: "data:image/gif;base64,R0lG",
    });
  });
});
