import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchJson, fetchText } from "../http";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("upstream HTTP helpers", () => {
  it("sends browser-like headers and parses JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchJson("https://example.com/data", {
        referer: "https://example.com/",
      }),
    ).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/data",
      expect.objectContaining({
        headers: expect.objectContaining({
          Referer: "https://example.com/",
          "User-Agent": expect.stringContaining("Mozilla/5.0"),
        }),
      }),
    );
  });

  it("rejects non-success responses without exposing the response body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("secret", { status: 418 })),
    );

    await expect(fetchText("https://example.com")).rejects.toThrow(
      "上游请求失败 (418)",
    );
  });
});
