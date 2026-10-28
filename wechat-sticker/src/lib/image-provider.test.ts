import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildRefImagePayload,
  buildStickerPrompt,
  buildTextToImagePayload,
  createImageTask,
  generateCharacterImage,
  generateExpressionImage,
  mapDashScopeError,
  pollImageTask,
} from "./image-provider";

describe("buildStickerPrompt", () => {
  it("appends sticker style hints", () => {
    expect(buildStickerPrompt("橘色小猫")).toContain("微信表情包");
    expect(buildStickerPrompt("橘色小猫")).toContain("橘色小猫");
  });
});

describe("mapDashScopeError", () => {
  it("maps known codes", () => {
    expect(mapDashScopeError("InvalidApiKey")).toContain("API Key");
    expect(mapDashScopeError("Other", "boom")).toBe("boom");
  });

  it("maps model not exist for beijing i2v naming", () => {
    expect(mapDashScopeError(undefined, "Model not exist.")).toContain(
      "wanx2.1-i2v-turbo",
    );
  });
});

describe("payload builders", () => {
  it("builds text-to-image payload", () => {
    const payload = buildTextToImagePayload("hello", "wanx2.1-t2i-turbo");
    expect(payload.model).toBe("wanx2.1-t2i-turbo");
    expect(payload).toMatchObject({
      input: { prompt: "hello" },
      parameters: { size: "1024*1024", n: 1 },
    });
  });

  it("builds ref image payload with custom strength and mode", () => {
    const payload = buildRefImagePayload("hello", "oss://ref.png", "wanx-v1", {
      refStrength: 0.48,
      refMode: "repaint",
      negativePrompt: "姿势不变",
    });
    expect(payload).toMatchObject({
      model: "wanx-v1",
      input: {
        prompt: "hello",
        ref_img: "oss://ref.png",
        negative_prompt: "姿势不变",
      },
      parameters: { ref_strength: 0.48, ref_mode: "repaint" },
    });
  });
});

describe("createImageTask / pollImageTask", () => {
  it("creates a task id", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ output: { task_id: "task-1" } }),
    });
    await expect(
      createImageTask("sk-test", { model: "x" }, fetchImpl),
    ).resolves.toBe("task-1");
  });

  it("polls until succeeded", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ output: { task_status: "RUNNING" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          output: {
            task_status: "SUCCEEDED",
            results: [{ url: "https://cdn.example.com/out.png" }],
          },
        }),
      });

    await expect(
      pollImageTask("sk-test", "task-1", {
        fetchImpl,
        sleep: async () => undefined,
        intervalMs: 0,
      }),
    ).resolves.toBe("https://cdn.example.com/out.png");
  });
});

describe("generateCharacterImage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("throws when api key missing", async () => {
    await expect(
      generateCharacterImage({ apiKey: "" }, { prompt: "猫" }),
    ).rejects.toThrow(/DASHSCOPE_API_KEY/);
  });

  it("runs text-to-image flow end to end", async () => {
    const png = Buffer.from([1, 2, 3]);
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ output: { task_id: "t1" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          output: {
            task_status: "SUCCEEDED",
            results: [{ url: "https://cdn.example.com/out.png" }],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () =>
          png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength),
      });

    const result = await generateCharacterImage(
      {
        apiKey: "sk-test",
        fetchImpl,
      },
      { prompt: "猫" },
    );
    expect(Buffer.compare(result, png)).toBe(0);
  });
});

describe("generateExpressionImage", () => {
  it("uses text-to-image then downloads the result", async () => {
    const png = Buffer.from([9, 9, 9]);
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ output: { task_id: "t-expr" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          output: {
            task_status: "SUCCEEDED",
            results: [{ url: "https://cdn.example.com/e.png" }],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () =>
          png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength),
      });

    const result = await generateExpressionImage(
      { apiKey: "sk-test", fetchImpl },
      { prompt: "橘色小猫，竖大拇指", seed: 42 },
    );
    expect(Buffer.compare(result, png)).toBe(0);
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("text2image"),
      expect.objectContaining({
        body: expect.stringContaining('"seed":42'),
      }),
    );
  });
});
