// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { runTryOn } from "./tryOn";

const upload = vi.fn();
const createTask = vi.fn();
const poll = vi.fn();

function imageFile(name: string) {
  return new File([new Uint8Array(10 * 1024)], name, { type: "image/jpeg" });
}

describe("runTryOn", () => {
  beforeEach(() => {
    upload.mockReset();
    createTask.mockReset();
    poll.mockReset();
    upload
      .mockResolvedValueOnce("oss://person.jpg")
      .mockResolvedValueOnce("oss://garment.jpg");
    createTask.mockResolvedValue("task-1");
    poll.mockResolvedValue("https://cdn.example.com/result.jpg");
  });

  it("rejects a missing API key", async () => {
    await expect(
      runTryOn({
        apiKey: "",
        person: imageFile("p.jpg"),
        garment: imageFile("g.jpg"),
        garmentType: "top",
      }),
    ).rejects.toMatchObject({
      status: 503,
      message: "未配置 DASHSCOPE_API_KEY，请在 .env.local 中填写北京地域的 Key",
    });
  });

  it("rejects an invalid garment type", async () => {
    await expect(
      runTryOn({
        apiKey: "sk-test",
        person: imageFile("p.jpg"),
        garment: imageFile("g.jpg"),
        garmentType: "shoes",
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: "请选择衣物类型：上衣、下装或连衣裙",
    });
  });

  it("uploads both images and returns the try-on result", async () => {
    await expect(
      runTryOn({
        apiKey: "sk-test",
        person: imageFile("p.jpg"),
        garment: imageFile("g.jpg"),
        garmentType: "bottom",
        upload,
        createTask,
        poll,
      }),
    ).resolves.toEqual({ imageUrl: "https://cdn.example.com/result.jpg" });

    expect(createTask).toHaveBeenCalledWith(
      "sk-test",
      "oss://person.jpg",
      "oss://garment.jpg",
      "bottom",
    );
  });
});
