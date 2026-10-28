import { beforeEach, describe, expect, it, vi } from "vitest";

const { runTryOn } = vi.hoisted(() => ({
  runTryOn: vi.fn(),
}));

vi.mock("@/lib/tryOn", async () => {
  const actual = await vi.importActual<typeof import("@/lib/tryOn")>("@/lib/tryOn");
  return {
    ...actual,
    runTryOn,
  };
});

import { POST } from "./route";

function imageFile(name: string) {
  return new File([new Uint8Array(10 * 1024)], name, { type: "image/jpeg" });
}

describe("POST /api/try-on", () => {
  beforeEach(() => {
    runTryOn.mockReset();
    process.env.DASHSCOPE_API_KEY = "sk-test";
  });

  it("returns 400 when an image is missing", async () => {
    const form = new FormData();
    form.set("garmentType", "top");
    const response = await POST({
      formData: async () => form,
    } as Request);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("人物照"),
    });
  });

  it("returns the try-on result from the service", async () => {
    runTryOn.mockResolvedValue({ imageUrl: "https://cdn.example.com/result.jpg" });
    const form = new FormData();
    form.set("person", imageFile("p.jpg"));
    form.set("garment", imageFile("g.jpg"));
    form.set("garmentType", "bottom");
    const response = await POST({
      formData: async () => form,
    } as Request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      imageUrl: "https://cdn.example.com/result.jpg",
    });
    expect(runTryOn).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "sk-test",
        garmentType: "bottom",
      }),
    );
  });
});
