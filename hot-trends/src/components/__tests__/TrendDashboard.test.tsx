import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AUTO_REFRESH_MS,
  TrendDashboard,
} from "../TrendDashboard";

const response = {
  updatedAt: "2026-08-25T03:00:00.000Z",
  platforms: [
    {
      platform: "zhihu" as const,
      name: "知乎",
      status: "ok" as const,
      updatedAt: "2026-08-25T03:00:00.000Z",
      items: [
        {
          rank: 1,
          title: "测试热点标题",
          url: "https://example.com/topic",
          metricLabel: "热度",
          metricValue: "123 万",
        },
      ],
    },
  ],
};

const refreshedResponse = {
  ...response,
  updatedAt: "2026-08-25T03:00:08.000Z",
  platforms: [
    {
      ...response.platforms[0],
      updatedAt: "2026-08-25T03:00:08.000Z",
      items: [
        {
          ...response.platforms[0].items[0],
          title: "刷新后的热点标题",
        },
      ],
    },
  ],
};

function jsonResponse(data = response) {
  return Promise.resolve({
    ok: true,
    json: async () => data,
  } as Response);
}

function installFetch(
  trends: (url: string) => Promise<Response> = () => jsonResponse(),
) {
  const fetchMock = vi.fn((url: string) => {
    if (String(url).startsWith("/api/presence")) {
      return jsonResponse({ online: 3, today: 8 });
    }
    return trends(String(url));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("TrendDashboard", () => {
  it("loads and renders platform trends", async () => {
    installFetch();

    render(<TrendDashboard />);

    expect(await screen.findByText("测试热点标题")).toBeInTheDocument();
    expect(screen.getByText("123 万")).toBeInTheDocument();
    expect(screen.getByText("在线人数")).toBeInTheDocument();
    expect(screen.getByText("今日访问")).toBeInTheDocument();
    expect(await screen.findByText("3")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /测试热点标题/ })).toHaveAttribute(
      "target",
      "_blank",
    );
  });

  it("forces a refresh while keeping the existing list visible", async () => {
    let resolveRefresh: (value: Response) => void = () => undefined;
    let trendCalls = 0;
    const fetchMock = installFetch(
      () => {
        trendCalls += 1;
        if (trendCalls === 1) {
          return jsonResponse();
        }
        return new Promise<Response>((resolve) => {
          resolveRefresh = resolve;
        });
      },
    );

    render(<TrendDashboard />);
    await screen.findByText("测试热点标题");

    await userEvent.click(screen.getByRole("button", { name: "立即刷新" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/trends?refresh=1",
      expect.objectContaining({ cache: "no-store" }),
    );
    expect(screen.getByText("测试热点标题")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "刷新中…" })).toBeDisabled();

    await act(async () => {
      resolveRefresh({
        ok: true,
        json: async () => refreshedResponse,
      } as Response);
    });

    expect(screen.getByText("刷新后的热点标题")).toBeInTheDocument();
    expect(screen.queryByText("测试热点标题")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "刷新完成，1/1 个平台可用",
    );
  });

  it("refreshes automatically every thirty minutes", async () => {
    vi.useFakeTimers();
    const fetchMock = installFetch();

    render(<TrendDashboard />);
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(AUTO_REFRESH_MS);
      await Promise.resolve();
    });

    const trendCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).startsWith("/api/trends"),
    );
    expect(trendCalls).toHaveLength(2);
  });
});
