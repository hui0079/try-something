import { describe, expect, it } from "vitest";

import {
  DEFAULT_TEMPLATES,
  defaultCaptions,
  templatesFromCaptions,
} from "./sticker-templates";

describe("sticker-templates", () => {
  it("exposes 8 default captions", () => {
    expect(defaultCaptions()).toHaveLength(8);
    expect(DEFAULT_TEMPLATES).toHaveLength(8);
  });

  it("maps custom captions onto styles", () => {
    const templates = templatesFromCaptions(["嗨", "拜"]);
    expect(templates).toHaveLength(2);
    expect(templates[0]?.caption).toBe("嗨");
    expect(templates[0]?.accent).toBe(DEFAULT_TEMPLATES[0]?.accent);
    expect(templates[1]?.caption).toBe("拜");
  });
});
