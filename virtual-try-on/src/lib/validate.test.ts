import { describe, expect, it } from "vitest";

import { parseGarmentType, validateImageFile } from "./validate";

function fileOf(name: string, type: string, size: number) {
  return new File([new Uint8Array(size)], name, { type });
}

describe("validateImageFile", () => {
  it("accepts jpeg, png, webp and bmp between 5KB and 5MB", () => {
    for (const type of [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/bmp",
    ]) {
      expect(validateImageFile(fileOf("a.jpg", type, 10 * 1024))).toEqual({
        ok: true,
      });
    }
  });

  it("rejects files smaller than 5KB", () => {
    const result = validateImageFile(fileOf("a.jpg", "image/jpeg", 1024));
    expect(result).toEqual({
      ok: false,
      error: "图片需介于 5KB 和 5MB 之间",
    });
  });

  it("rejects files larger than 5MB", () => {
    const result = validateImageFile(
      fileOf("a.jpg", "image/jpeg", 5 * 1024 * 1024 + 1),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects unsupported image types", () => {
    expect(validateImageFile(fileOf("a.gif", "image/gif", 10 * 1024))).toEqual({
      ok: false,
      error: "仅支持 JPG、PNG、WEBP、BMP 图片",
    });
  });
});

describe("parseGarmentType", () => {
  it("accepts top, bottom and dress", () => {
    expect(parseGarmentType("top")).toBe("top");
    expect(parseGarmentType("bottom")).toBe("bottom");
    expect(parseGarmentType("dress")).toBe("dress");
  });

  it("rejects unknown garment types", () => {
    expect(parseGarmentType("shoes")).toBeNull();
    expect(parseGarmentType("")).toBeNull();
  });
});
