import { describe, expect, it } from "vitest";

import {
  sanitizeCaptions,
  validateImageFile,
  validatePrompt,
} from "./validate";

describe("validatePrompt", () => {
  it("accepts a normal prompt", () => {
    expect(validatePrompt("橘色小猫")).toEqual({ ok: true });
  });

  it("rejects empty prompt", () => {
    expect(validatePrompt("  ")).toEqual({
      ok: false,
      message: "请填写角色描述",
    });
  });
});

describe("validateImageFile", () => {
  it("accepts png in range", () => {
    expect(
      validateImageFile({ type: "image/png", size: 20 * 1024 }),
    ).toEqual({ ok: true });
  });

  it("rejects gif", () => {
    expect(
      validateImageFile({ type: "image/gif", size: 20 * 1024 }),
    ).toEqual({
      ok: false,
      message: "仅支持 JPG / PNG / WEBP / BMP",
    });
  });
});

describe("sanitizeCaptions", () => {
  it("accepts up to 8 captions", () => {
    expect(sanitizeCaptions(["好的", "不行"])).toEqual(["好的", "不行"]);
  });

  it("rejects empty or too long", () => {
    expect(sanitizeCaptions([])).toBeNull();
    expect(sanitizeCaptions(["这是超过八个字的文案"])).toBeNull();
  });
});
