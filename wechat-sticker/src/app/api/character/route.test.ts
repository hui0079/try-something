import { beforeEach, describe, expect, it, vi } from "vitest";

const { runCharacterGeneration, CharacterError } = vi.hoisted(() => {
  class CharacterError extends Error {
    status: number;
    constructor(message: string, status = 400) {
      super(message);
      this.name = "CharacterError";
      this.status = status;
    }
  }
  return {
    runCharacterGeneration: vi.fn(),
    CharacterError,
  };
});

vi.mock("@/lib/character", () => ({
  CharacterError,
  runCharacterGeneration,
}));

import { POST } from "./route";

describe("POST /api/character", () => {
  beforeEach(() => {
    runCharacterGeneration.mockReset();
  });

  it("returns 400 when generation rejects with CharacterError", async () => {
    runCharacterGeneration.mockRejectedValue(
      new CharacterError("请填写角色描述", 400),
    );
    const form = new FormData();
    form.set("prompt", "");
    const response = await POST({
      formData: async () => form,
    } as Request);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "请填写角色描述",
    });
  });

  it("returns image base64 on success", async () => {
    runCharacterGeneration.mockResolvedValue({
      imageBase64: "data:image/png;base64,abc",
      mimeType: "image/png",
    });
    const form = new FormData();
    form.set("prompt", "橘色小猫");
    const response = await POST({
      formData: async () => form,
    } as Request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      imageBase64: "data:image/png;base64,abc",
      mimeType: "image/png",
    });
    expect(runCharacterGeneration).toHaveBeenCalled();
  });
});
