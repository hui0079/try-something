import { beforeEach, describe, expect, it, vi } from "vitest";

const aggregateTrends = vi.fn();

vi.mock("@/lib/trends/service", () => ({ aggregateTrends }));
vi.mock("@/lib/trends/adapters", () => ({
  trendAdapters: [
    { id: "zhihu", name: "知乎", fetch: vi.fn() },
    { id: "weibo", name: "微博", fetch: vi.fn() },
  ],
}));

describe("GET /api/trends", () => {
  beforeEach(() => {
    aggregateTrends.mockResolvedValue({
      platforms: [],
      updatedAt: "2026-08-25T03:00:00.000Z",
    });
  });

  it("passes the explicit force-refresh flag and disables HTTP caching", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/trends?refresh=1"),
    );

    expect(aggregateTrends).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: "zhihu" })]),
      expect.anything(),
      { force: true },
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      platforms: [],
      updatedAt: "2026-08-25T03:00:00.000Z",
    });
  });

  it("can refresh a single known platform", async () => {
    const { GET } = await import("./route");
    await GET(
      new Request("http://localhost/api/trends?refresh=1&platform=zhihu"),
    );

    expect(aggregateTrends).toHaveBeenLastCalledWith(
      [expect.objectContaining({ id: "zhihu" })],
      expect.anything(),
      { force: true },
    );
  });
});
