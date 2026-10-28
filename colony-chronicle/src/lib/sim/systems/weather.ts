import { makeEvent, type SimEvent } from "../events";
import type { TickContext } from "../context";
import type { Rng } from "../rng";
import type { Season, Weather, World } from "../types";

const TABLE: Record<Season, ReadonlyArray<[Weather, number]>> = {
  spring: [
    ["clear", 0.35],
    ["overcast", 0.25],
    ["rain", 0.3],
    ["storm", 0.05],
    ["drought", 0.03],
    ["coldSnap", 0.02],
  ],
  summer: [
    ["clear", 0.45],
    ["overcast", 0.15],
    ["rain", 0.18],
    ["storm", 0.1],
    ["drought", 0.12],
  ],
  autumn: [
    ["clear", 0.3],
    ["overcast", 0.3],
    ["rain", 0.25],
    ["storm", 0.08],
    ["drought", 0.05],
    ["coldSnap", 0.02],
  ],
  winter: [
    ["clear", 0.25],
    ["overcast", 0.33],
    ["rain", 0.1],
    ["storm", 0.07],
    ["drought", 0.03],
    ["coldSnap", 0.22],
  ],
};

/** Weather the player has forced overrides the roll. */
function forcedWeather(world: World): Weather | null {
  for (const effect of world.effects) {
    if (effect.kind === "rain") return effect.magnitude > 1.2 ? "storm" : "rain";
    if (effect.kind === "drought") return "drought";
    if (effect.kind === "cold") return "coldSnap";
    if (effect.kind === "warm") return "clear";
  }
  return null;
}

export const NOTABLE_WEATHER: ReadonlySet<Weather> = new Set<Weather>([
  "storm",
  "drought",
  "coldSnap",
]);

/** How long a spell of each kind lasts, in days. */
const SPELL_LENGTH: Record<Weather, [number, number]> = {
  clear: [2, 5],
  overcast: [1, 3],
  rain: [1, 4],
  storm: [1, 2],
  drought: [6, 14],
  coldSnap: [3, 8],
};

export function stepWeather(world: World, ctx: TickContext, rng: Rng): SimEvent[] {
  const previous = world.weather;
  const forced = forcedWeather(world);

  if (forced) {
    world.weather = forced;
    world.weatherDays = 1;
  } else {
    world.weatherDays -= 1;
    if (world.weatherDays <= 0) {
      const table = TABLE[ctx.calendar.season];
      world.weather = rng.weighted(table, ([, w]) => w)?.[0] ?? "clear";
      const [min, max] = SPELL_LENGTH[world.weather];
      world.weatherDays = rng.intBetween(min, max);
    }
  }

  // Only a change into something people would talk about earns a line, and a
  // passing storm is weather while a drought is a threat.
  if (world.weather !== previous && NOTABLE_WEATHER.has(world.weather)) {
    const severity = world.weather === "storm" ? "minor" : "notable";
    return [
      makeEvent(world.tick, severity, { type: "weather", weather: world.weather, region: null }),
    ];
  }
  return [];
}

export const FARM_WEATHER_FACTOR: Record<Weather, number> = {
  clear: 1,
  overcast: 0.95,
  rain: 1.12,
  storm: 0.75,
  drought: 0.55,
  coldSnap: 0.6,
};

/** Rain on top of a region's own inflow. */
export const WATER_GAIN: Record<Weather, number> = {
  clear: 0,
  overcast: 0.6,
  rain: 3,
  storm: 6,
  drought: 0,
  coldSnap: 0.2,
};
