import { describe, expect, it } from "vitest";

import { INTERVENTIONS } from "@/lib/sim/intervene";
import { makeEvent, type EventBody, type EventType, type SimEvent } from "@/lib/sim/events";
import { advance } from "@/lib/sim/tick";
import { createWorld } from "@/lib/sim/world";

import { renderChronicle, renderLine } from "./render";
import { RENDERERS } from "./templates";

/** One of every event type, so no renderer can rot unnoticed. */
const SAMPLES: EventBody[] = [
  { type: "founding", names: ["石禾", "林鹿", "河井"], region: "河湾" },
  { type: "season", season: "autumn", year: 3 },
  { type: "weather", weather: "storm", region: null },
  { type: "harvest", region: "南坡", regionId: "southSlope", amount: 9.4, names: ["石禾"] },
  { type: "hunt", region: "橡树林", regionId: "oakwood", amount: 4.2, name: "林鹿" },
  { type: "huntFail", region: "橡树林", regionId: "oakwood", name: "林鹿" },
  { type: "injury", name: "林鹿", id: "v2", region: "橡树林", regionId: "oakwood" },
  { type: "starving", region: "河湾", regionId: "riverbend", names: ["石禾", "河井"] },
  { type: "thirsting", region: "石岗", regionId: "stoneRidge", names: ["桑镰"] },
  {
    type: "death",
    name: "石禾",
    id: "v1",
    age: 61,
    cause: "age",
    region: "河湾",
    regionId: "riverbend",
  },
  { type: "birth", name: "白苔", id: "v9", motherName: "林鹿", region: "河湾", regionId: "riverbend" },
  { type: "comingOfAge", name: "白苔", id: "v9", region: "河湾", regionId: "riverbend" },
  { type: "mastery", name: "林鹿", id: "v2", title: "猎手", region: "橡树林", regionId: "oakwood" },
  { type: "pairing", a: "石禾", b: "林鹿", region: "河湾", regionId: "riverbend" },
  { type: "departure", name: "桑镰", id: "v4", region: "石岗", regionId: "stoneRidge" },
  { type: "arrival", name: "野藤", id: "v12", region: "河湾", regionId: "riverbend" },
  {
    type: "migration",
    names: ["石禾", "河井"],
    from: "河湾",
    fromId: "riverbend",
    to: "南坡",
    toId: "southSlope",
    reason: "hunger",
  },
  { type: "build", names: ["陶锤"], region: "河湾", regionId: "riverbend", shelter: 62 },
  { type: "bond", a: "石禾", b: "河井", region: "河湾", regionId: "riverbend" },
  { type: "feud", a: "石禾", b: "桑镰", region: "河湾", regionId: "riverbend" },
  { type: "faction", region: "河湾", regionId: "riverbend", leaderName: "桑镰", size: 4 },
  {
    type: "schism",
    from: "河湾",
    fromId: "riverbend",
    to: "橡树林",
    toId: "oakwood",
    names: ["桑镰", "灰狐"],
  },
  { type: "prayer", names: ["白苔"], region: "圣泉", regionId: "holySpring", faith: 44 },
  { type: "depleted", region: "河湾", regionId: "riverbend", resource: "food" },
  { type: "depleted", region: "石岗", regionId: "stoneRidge", resource: "water" },
  { type: "recovered", region: "橡树林", regionId: "oakwood", resource: "game" },
  { type: "intervention", kind: "rain", regions: [], regionIds: [] },
  { type: "plague", region: "河湾", regionId: "riverbend", names: ["石禾"] },
  {
    type: "yearSummary",
    year: 2,
    population: 9,
    births: 2,
    deaths: 1,
    departures: 0,
    arrivals: 1,
    food: 84,
  },
  { type: "collapse", region: "河湾" },
  { type: "recede", name: "石禾", id: "v1", childName: "白苔", region: "河湾", regionId: "riverbend" },
  {
    type: "order",
    name: "林氏",
    kind: "clan",
    leaderName: "林鹿",
    region: "河湾",
    regionId: "riverbend",
  },
  { type: "realm", name: "林朝", era: "禾初", rulerName: "林鹿", region: "河湾", regionId: "riverbend" },
  {
    type: "secession",
    name: "桑朝",
    from: "林朝",
    rulerName: "桑镰",
    region: "橡树林",
    regionId: "oakwood",
    names: ["桑镰", "灰狐"],
  },
  {
    type: "succession",
    realm: "林朝",
    predecessor: "林鹿",
    successor: "白苔",
    region: "河湾",
    regionId: "riverbend",
  },
  { type: "arms", realm: "林朝", region: "石岗", regionId: "stoneRidge" },
  {
    type: "battle",
    attacker: "林朝",
    defender: "桑朝",
    region: "橡树林",
    regionId: "oakwood",
    winner: "林朝",
    fallen: ["灰狐"],
  },
  { type: "attrition", region: "河湾", regionId: "riverbend" },
  { type: "realmEnd", name: "桑朝", region: "橡树林", regionId: "oakwood" },
];

function textOf(body: EventBody): string {
  return renderLine(makeEvent(12, "notable", body), 0).text;
}

describe("renderers", () => {
  it("covers every event type", () => {
    const covered = new Set(SAMPLES.map((s) => s.type));
    const declared = Object.keys(RENDERERS) as EventType[];
    expect([...declared].filter((t) => !covered.has(t))).toEqual([]);
  });

  it("produces readable Chinese with no leftover placeholders", () => {
    for (const sample of SAMPLES) {
      const text = textOf(sample);
      expect(text, sample.type).not.toContain("{");
      expect(text, sample.type).not.toContain("undefined");
      expect(text, sample.type).not.toContain("NaN");
      expect(text.length, sample.type).toBeGreaterThan(3);
      expect(text, sample.type).toMatch(/[。！]$/);
    }
  });

  it("fills in every intervention phrase, including the two-region ones", () => {
    for (const def of INTERVENTIONS) {
      const regions = def.targets === 2 ? ["河湾", "南坡"] : def.targets === 1 ? ["河湾"] : [];
      const text = textOf({
        type: "intervention",
        kind: def.kind,
        regions,
        regionIds: regions,
      });
      expect(text, def.kind).not.toContain("{");
      expect(text, def.kind).not.toContain("那里");
    }
  });

  it("words the same event the same way every time", () => {
    const event = makeEvent(7, "major", SAMPLES[9]);
    expect(renderLine(event, 3).text).toBe(renderLine(event, 3).text);
  });

  it("words the same event differently at a different point in the log", () => {
    const variants = new Set(
      Array.from({ length: 12 }, (_, i) => renderLine(makeEvent(i, "notable", SAMPLES[9]), i).text),
    );
    expect(variants.size).toBeGreaterThan(1);
  });
});

describe("renderChronicle", () => {
  const log: SimEvent[] = [
    makeEvent(3, "minor", SAMPLES[3]),
    makeEvent(3, "major", SAMPLES[9]),
    makeEvent(5, "notable", SAMPLES[1]),
  ];

  it("groups by day, oldest first", () => {
    const entries = renderChronicle(log);
    expect(entries.map((e) => e.tick)).toEqual([3, 5]);
    expect(entries[0].lines).toHaveLength(2);
  });

  it("puts the most serious line of a day first", () => {
    const [first] = renderChronicle(log);
    expect(first.lines[0].severity).toBe("major");
  });

  it("labels the date in the settlement's own calendar", () => {
    const [first] = renderChronicle(log);
    expect(first.dateLabel).toBe("第 1 年 春 第 4 日");
  });

  it("filters out the small stuff on request", () => {
    const entries = renderChronicle(log, { minSeverity: "notable" });
    expect(entries.flatMap((e) => e.lines)).toHaveLength(2);
  });

  it("filters to a single region on request", () => {
    const entries = renderChronicle(log, { regionId: "southSlope" });
    expect(entries.flatMap((e) => e.lines).map((l) => l.type)).toEqual(["harvest"]);
  });

  it("renders a real run end to end without producing garbage", () => {
    const { world, events } = createWorld("编年");
    const run = advance(world, 300);
    const entries = renderChronicle([...events, ...run.events]);
    expect(entries.length).toBeGreaterThan(20);
    for (const entry of entries) {
      for (const line of entry.lines) {
        expect(line.text).not.toContain("{");
        expect(line.text).not.toContain("undefined");
        expect(line.text).not.toContain("NaN");
      }
    }
  });

  it("folds a run into one short article per year", () => {
    const { world, events } = createWorld("按年");
    const run = advance(world, 360);
    const all = [...events, ...run.events];
    const entries = renderChronicle(all, { byYear: true });
    expect(entries.map((entry) => entry.dateLabel)).toEqual(["第 1 年", "第 2 年", "第 3 年"]);
    const notableDays = renderChronicle(all, { minSeverity: "notable" }).reduce(
      (sum, entry) => sum + entry.lines.length,
      0,
    );
    const annalLines = entries.reduce((sum, entry) => sum + entry.lines.length, 0);
    expect(annalLines).toBeLessThan(notableDays / 2);
    expect(entries[0].lines.some((line) => line.type === "yearSummary")).toBe(true);
  });

  it("gives every line a unique key", () => {
    const { world, events } = createWorld("唯一");
    const run = advance(world, 200);
    const ids = renderChronicle([...events, ...run.events]).flatMap((e) =>
      e.lines.map((l) => l.id),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});
