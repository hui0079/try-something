import type { SimEvent } from "./sim/events";
import type { World } from "./sim/types";
import { ensureState, WORLD_VERSION } from "./sim/world";

export const SAVE_KIND = "colony-chronicle";
export const STORAGE_KEY = "colony-chronicle:save";

export type SaveFile = {
  kind: typeof SAVE_KIND;
  version: number;
  savedAt: string;
  world: World;
  events: SimEvent[];
};

export type ParseResult =
  | { ok: true; save: SaveFile }
  | { ok: false; error: string };

export function buildSave(world: World, events: readonly SimEvent[]): SaveFile {
  return {
    kind: SAVE_KIND,
    version: WORLD_VERSION,
    savedAt: new Date().toISOString(),
    world,
    events: [...events],
  };
}

export function serialize(world: World, events: readonly SimEvent[]): string {
  return JSON.stringify(buildSave(world, events), null, 2);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Hand-checked rather than schema-validated: a save file is a snapshot of our
 * own types, and the parts that would break the simulation if they were missing
 * are few and worth naming explicitly in the error message.
 */
function validateWorld(value: unknown): string | null {
  if (!isRecord(value)) return "存档里没有世界数据";
  if (typeof value.seed !== "string") return "存档缺少世界种子";
  if (typeof value.tick !== "number" || !Number.isFinite(value.tick)) return "存档的天数无效";
  if (typeof value.rngState !== "number") return "存档缺少随机数状态";
  if (!Array.isArray(value.regions) || value.regions.length === 0) return "存档里没有地块";
  if (!Array.isArray(value.villagers)) return "存档里没有居民列表";
  if (!Array.isArray(value.graves)) return "存档里没有逝者名录";
  for (const region of value.regions) {
    if (!isRecord(region) || typeof region.id !== "string" || typeof region.name !== "string") {
      return "存档里有损坏的地块";
    }
    if (typeof region.food !== "number" || typeof region.water !== "number") {
      return `地块「${String(region.name)}」的资源数据损坏`;
    }
  }
  for (const villager of value.villagers) {
    if (!isRecord(villager) || typeof villager.id !== "string" || typeof villager.name !== "string") {
      return "存档里有损坏的居民";
    }
    if (typeof villager.regionId !== "string") return `居民「${String(villager.name)}」没有所在地`;
  }
  return null;
}

export function parseSave(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "这不是一个合法的 JSON 文件" };
  }
  if (!isRecord(raw)) return { ok: false, error: "存档格式不对" };
  if (raw.kind !== SAVE_KIND) return { ok: false, error: "这不是聚落编年史的存档" };
  if (raw.version !== WORLD_VERSION) {
    return { ok: false, error: `存档版本是 ${String(raw.version)}，当前只能读 ${WORLD_VERSION}` };
  }
  const worldError = validateWorld(raw.world);
  if (worldError) return { ok: false, error: worldError };
  if (!Array.isArray(raw.events)) return { ok: false, error: "存档里没有编年史" };

  return {
    ok: true,
    save: {
      kind: SAVE_KIND,
      version: raw.version,
      savedAt: typeof raw.savedAt === "string" ? raw.savedAt : new Date().toISOString(),
      world: ensureState(raw.world as World),
      events: raw.events as SimEvent[],
    },
  };
}

export function saveLocal(world: World, events: readonly SimEvent[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, serialize(world, events));
  } catch {
    // A full or blocked storage quota must never take the game down with it.
  }
}

export function loadLocal(): SaveFile | null {
  if (typeof window === "undefined") return null;
  const text = window.localStorage.getItem(STORAGE_KEY);
  if (!text) return null;
  const result = parseSave(text);
  return result.ok ? result.save : null;
}

export function saveFileName(world: World): string {
  return `聚落编年史-${world.seed}-第${Math.floor(world.tick / 120) + 1}年.json`;
}
