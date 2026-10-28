import { describe, expect, it } from "vitest";

import { cnAmount, cnNumber, cnPeople, joinNames } from "./numbers";

describe("cnNumber", () => {
  it("reads out the small numbers a chronicle needs", () => {
    expect(cnNumber(0)).toBe("零");
    expect(cnNumber(7)).toBe("七");
    expect(cnNumber(10)).toBe("十");
    expect(cnNumber(11)).toBe("十一");
    expect(cnNumber(20)).toBe("二十");
    expect(cnNumber(23)).toBe("二十三");
    expect(cnNumber(90)).toBe("九十");
  });

  it("falls back to digits once numerals stop helping", () => {
    expect(cnNumber(128)).toBe("128");
  });

  it("rounds rather than emitting a fraction", () => {
    expect(cnNumber(3.6)).toBe("四");
  });
});

describe("cnPeople", () => {
  it("uses the counting form for two", () => {
    expect(cnPeople(1)).toBe("一人");
    expect(cnPeople(2)).toBe("两人");
    expect(cnPeople(5)).toBe("五人");
  });
});

describe("joinNames", () => {
  it("lists short groups in full", () => {
    expect(joinNames(["石禾", "林鹿"])).toBe("石禾、林鹿");
  });

  it("summarises long groups instead of reading like a roster", () => {
    expect(joinNames(["a", "b", "c", "d", "e"])).toBe("a、b、c等五人");
  });

  it("handles an empty group", () => {
    expect(joinNames([])).toBe("无人");
  });

  it("respects a custom limit", () => {
    expect(joinNames(["a", "b", "c"], 2)).toBe("a、b等三人");
  });
});

describe("cnAmount", () => {
  it("describes quantities the way a villager would", () => {
    expect(cnAmount(0.4)).toBe("一点");
    expect(cnAmount(2)).toBe("少许");
    expect(cnAmount(5)).toBe("五份");
    expect(cnAmount(42)).toBe("42份");
  });
});
