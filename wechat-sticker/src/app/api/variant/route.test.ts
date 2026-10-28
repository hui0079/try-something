import { beforeEach, describe, expect, it, vi } from "vitest";

const { runExpressionVariant, VariantError } = vi.hoisted(() => {
  class VariantError extends Error {
    status: number;
    constructor(message: string, status = 400) {
      super(message);
      this.name = "VariantError";
      this.status = status;
    }
  }
  return {
    runExpressionVariant: vi.fn(),
    VariantError,
  };
});

vi.mock("@/lib/variant", () => ({
  VariantError,
  runExpressionVariant,
}));

import { POST } from "./route";

describe("POST /api/variant", () => {
  beforeEach(() => {
    runExpressionVariant.mockReset();
  });

  it("returns 400 on VariantError", async () => {
    runExpressionVariant.mockRejectedValue(
      new VariantError("文案无效（1–8 字）", 400),
    );
    const response = await POST({
      json: async () => ({
        characterPrompt: "猫",
        caption: "",
        index: 0,
      }),
    } as Request);
    expect(response.status).toBe(400);
  });

  it("returns variant payload on success", async () => {
    runExpressionVariant.mockResolvedValue({
      index: 0,
      caption: "好的",
      imageBase64: "data:image/gif;base64,abc",
      expressionHint: "点头",
    });
    const response = await POST({
      json: async () => ({
        characterBase64: "data:image/png;base64,aa",
        caption: "好的",
        index: 0,
      }),
    } as Request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      caption: "好的",
      imageBase64: "data:image/gif;base64,abc",
    });
    expect(runExpressionVariant).toHaveBeenCalledWith(
      expect.objectContaining({
        characterBase64: "data:image/png;base64,aa",
        caption: "好的",
      }),
    );
  });
});
