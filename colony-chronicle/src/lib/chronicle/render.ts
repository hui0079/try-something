import { calendarOf, SEASON_LABEL } from "@/lib/sim/calendar";
import type { EventType, Severity, SimEvent } from "@/lib/sim/events";
import type { Season } from "@/lib/sim/types";

import { RENDERERS, type Pick } from "./templates";

export type ChronicleLine = {
  /** Stable across re-renders, which React needs and a saved log must preserve. */
  id: string;
  text: string;
  severity: Severity;
  type: EventType;
  regionId?: string;
  villagerId?: string;
};

export type ChronicleEntry = {
  tick: number;
  year: number;
  season: Season;
  dayOfSeason: number;
  dateLabel: string;
  lines: ChronicleLine[];
};

const SEVERITY_RANK: Record<Severity, number> = { minor: 0, notable: 1, major: 2 };

/**
 * A year article names what changed the settlement. Seasons, weather, hunts
 * and sore arms stay in the log for a life page, but painting them all is what
 * made the feed seize up once time moved by the year.
 */
const ANNAL_TYPES: ReadonlySet<EventType> = new Set([
  "founding",
  "yearSummary",
  "birth",
  "death",
  "departure",
  "collapse",
  "pairing",
  "faction",
  "schism",
  "order",
  "realm",
  "secession",
  "succession",
  "arms",
  "battle",
  "realmEnd",
  "intervention",
]);

export type RenderOptions = {
  minSeverity?: Severity;
  regionId?: string;
  /** One article per year, the way a chronicle is actually read. */
  byYear?: boolean;
};

function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Wording is chosen from a hash of the event's own identity, so the same day
 * always reads the same way however many times it is rendered.
 */
function pickerFor(key: string): Pick {
  let step = 0;
  return <T>(options: readonly T[]): T => {
    const h = hash(`${key}#${step}`);
    step += 1;
    return options[h % options.length];
  };
}

export function dateLabel(tick: number): string {
  const cal = calendarOf(tick);
  return `第 ${cal.year} 年 ${SEASON_LABEL[cal.season]} 第 ${cal.dayOfSeason} 日`;
}

export function renderLine(event: SimEvent, index: number): ChronicleLine {
  const id = `${event.tick}-${index}-${event.type}`;
  const renderer = RENDERERS[event.type] as (e: SimEvent, pick: Pick) => string;
  return {
    id,
    text: renderer(event, pickerFor(id)),
    severity: event.severity,
    type: event.type,
    regionId: "regionId" in event ? (event.regionId as string) : undefined,
    villagerId: "id" in event ? (event.id as string) : undefined,
  };
}

function keepLine(event: SimEvent, line: ChronicleLine, options: RenderOptions, floor: number): boolean {
  if (SEVERITY_RANK[event.severity] < floor) return false;
  if (options.regionId && line.regionId && line.regionId !== options.regionId) return false;
  if (options.regionId && !line.regionId) return false;
  return true;
}

/** Groups the log into one entry per day, newest-last, skipping silent days. */
export function renderChronicle(
  events: readonly SimEvent[],
  options: RenderOptions = {},
): ChronicleEntry[] {
  const floor = SEVERITY_RANK[options.minSeverity ?? "minor"];
  if (options.byYear) return renderYears(events, options);

  const byTick = new Map<number, ChronicleLine[]>();

  events.forEach((event, index) => {
    if (SEVERITY_RANK[event.severity] < floor) return;
    const line = renderLine(event, index);
    if (!keepLine(event, line, options, floor)) return;
    const list = byTick.get(event.tick) ?? [];
    list.push(line);
    byTick.set(event.tick, list);
  });

  return [...byTick.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([tick, lines]) => {
      const cal = calendarOf(tick);
      return {
        tick,
        year: cal.year,
        season: cal.season,
        dayOfSeason: cal.dayOfSeason,
        dateLabel: dateLabel(tick),
        lines: lines.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]),
      };
    });
}

/** One short article a year: the turns of fate, not the day's chores. */
function renderYears(events: readonly SimEvent[], options: RenderOptions): ChronicleEntry[] {
  const byYear = new Map<number, { tick: number; lines: ChronicleLine[] }>();

  events.forEach((event, index) => {
    if (!ANNAL_TYPES.has(event.type)) return;
    const line = renderLine(event, index);
    if (options.regionId && line.regionId && line.regionId !== options.regionId) return;
    if (options.regionId && !line.regionId) return;
    const cal = calendarOf(event.tick);
    const bucket = byYear.get(cal.year) ?? { tick: event.tick, lines: [] };
    bucket.tick = event.tick;
    bucket.lines.push(line);
    byYear.set(cal.year, bucket);
  });

  return [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, bucket]) => {
      const cal = calendarOf(bucket.tick);
      return {
        tick: bucket.tick,
        year,
        season: cal.season,
        dayOfSeason: cal.dayOfSeason,
        dateLabel: `第 ${year} 年`,
        lines: bucket.lines,
      };
    });
}
