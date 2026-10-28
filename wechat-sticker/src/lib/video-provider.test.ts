import { describe, expect, it, vi } from "vitest";

import {
  buildImageToVideoPayload,
  createVideoTask,
  generateImageToVideo,
  pollVideoTask,
} from "./video-provider";

describe("buildImageToVideoPayload", () => {
  it("builds wan i2v payload", () => {
    const payload = buildImageToVideoPayload(
      "data:image/jpeg;base64,aa",
      "点头挥手",
      "wanx2.1-i2v-turbo",
      { duration: 3, resolution: "480P" },
    );
    expect(payload).toMatchObject({
      model: "wanx2.1-i2v-turbo",
      input: {
        prompt: "点头挥手",
        img_url: "data:image/jpeg;base64,aa",
      },
      parameters: { duration: 3, resolution: "480P" },
    });
  });
});

describe("createVideoTask / pollVideoTask", () => {
  it("creates a task id", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ output: { task_id: "vid-1" } }),
    });
    await expect(
      createVideoTask("sk-test", { model: "x" }, fetchImpl),
    ).resolves.toBe("vid-1");
  });

  it("polls until video url appears", async () => {
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
            video_url: "https://cdn.example.com/out.mp4",
          },
        }),
      });

    await expect(
      pollVideoTask("sk-test", "vid-1", {
        fetchImpl,
        sleep: async () => undefined,
        intervalMs: 0,
      }),
    ).resolves.toBe("https://cdn.example.com/out.mp4");
  });
});

describe("generateImageToVideo", () => {
  it("runs create → poll → download", async () => {
    const mp4 = Buffer.from([0, 0, 0, 1]);
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ output: { task_id: "vid-2" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          output: {
            task_status: "SUCCEEDED",
            video_url: "https://cdn.example.com/a.mp4",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () =>
          mp4.buffer.slice(mp4.byteOffset, mp4.byteOffset + mp4.byteLength),
      });

    const result = await generateImageToVideo(
      { apiKey: "sk-test", fetchImpl },
      { imgUrl: "data:image/jpeg;base64,aa" },
    );
    expect(Buffer.compare(result, mp4)).toBe(0);
  });
});
