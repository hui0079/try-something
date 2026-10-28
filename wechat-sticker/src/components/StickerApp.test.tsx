import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { StickerApp } from "./StickerApp";

describe("StickerApp", () => {
  it("renders the wizard and advances after mock character generation", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          imageBase64:
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        }),
      }),
    );

    render(<StickerApp />);
    expect(
      screen.getByRole("heading", { name: "微信表情包生成器" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "生成定妆" }));
    expect(
      await screen.findByRole("button", { name: "下一步：编辑文案" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "试做动图 GIF" }),
    ).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "下一步：编辑文案" }));
    expect(
      screen.getByRole("button", { name: "生成表情动图" }),
    ).toBeInTheDocument();

    vi.unstubAllGlobals();
  });
});
