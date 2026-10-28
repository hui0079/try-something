import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TryOnApp } from "./TryOnApp";

function jpegFile(name: string) {
  return new File([new Uint8Array(10 * 1024)], name, { type: "image/jpeg" });
}

describe("TryOnApp", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ imageUrl: "https://cdn.example.com/out.jpg" }),
      }),
    );
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
  });

  it("keeps generate disabled until both images are chosen", () => {
    render(<TryOnApp />);
    expect(screen.getByRole("button", { name: "开始试衣" })).toBeDisabled();
  });

  it("submits both images and shows the result", async () => {
    const user = userEvent.setup();
    render(<TryOnApp />);

    const personInput = screen.getByLabelText("选择人物图片");
    const garmentInput = screen.getByLabelText("选择衣物图片");
    await user.upload(personInput, jpegFile("person.jpg"));
    await user.upload(garmentInput, jpegFile("shirt.jpg"));
    await user.click(screen.getByRole("radio", { name: "下装" }));
    await user.click(screen.getByRole("button", { name: "开始试衣" }));

    expect(await screen.findByAltText("试衣结果")).toHaveAttribute(
      "src",
      "https://cdn.example.com/out.jpg",
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/try-on",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows an API error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "人物照需要是单人正面全身照" }),
      }),
    );
    const user = userEvent.setup();
    render(<TryOnApp />);
    const personInput = screen.getByLabelText("选择人物图片");
    const garmentInput = screen.getByLabelText("选择衣物图片");
    await user.upload(personInput, jpegFile("person.jpg"));
    await user.upload(garmentInput, jpegFile("shirt.jpg"));
    await user.click(screen.getByRole("button", { name: "开始试衣" }));

    expect(
      await screen.findByText("人物照需要是单人正面全身照"),
    ).toBeInTheDocument();
  });
});
