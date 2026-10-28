import { describe, expect, it } from "vitest";

import { formatShanghai } from "@/lib/time";

describe("formatShanghai", () => {
  it("shows an afternoon UTC timestamp as Shanghai time", () => {
    expect(formatShanghai("2026-10-28T06:53:06.000Z")).toBe("2026-10-28 14:53:06");
  });

  it("rolls midnight across the date line", () => {
    expect(formatShanghai("2026-10-27T16:00:00.000Z")).toBe("2026-10-28 00:00:00");
  });
});