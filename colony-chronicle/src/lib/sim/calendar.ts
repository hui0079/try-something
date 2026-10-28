import type { Season } from "./types";

export const DAYS_PER_SEASON = 30;
export const SEASONS: readonly Season[] = ["spring", "summer", "autumn", "winter"];
export const DAYS_PER_YEAR = DAYS_PER_SEASON * SEASONS.length;

export type Calendar = {
  year: number;
  season: Season;
  dayOfSeason: number;
  dayOfYear: number;
  /** True on the last day of winter, when the year summary is written. */
  isYearEnd: boolean;
};

export function calendarOf(tick: number): Calendar {
  const dayOfYear = ((tick % DAYS_PER_YEAR) + DAYS_PER_YEAR) % DAYS_PER_YEAR;
  const seasonIndex = Math.floor(dayOfYear / DAYS_PER_SEASON);
  return {
    year: Math.floor(tick / DAYS_PER_YEAR) + 1,
    season: SEASONS[seasonIndex],
    dayOfSeason: (dayOfYear % DAYS_PER_SEASON) + 1,
    dayOfYear,
    isYearEnd: dayOfYear === DAYS_PER_YEAR - 1,
  };
}

export const SEASON_LABEL: Record<Season, string> = {
  spring: "春",
  summer: "夏",
  autumn: "秋",
  winter: "冬",
};

/** How much a day of farming is worth this season. Winter is near-hopeless. */
export const FARM_SEASON_FACTOR: Record<Season, number> = {
  spring: 1.15,
  summer: 1.0,
  autumn: 1.25,
  winter: 0.22,
};

/** Wild food: berries, roots, deadfall. */
export const FORAGE_SEASON_FACTOR: Record<Season, number> = {
  spring: 0.9,
  summer: 1.1,
  autumn: 1.3,
  winter: 0.45,
};

/** Rations burn faster in the cold. */
export const METABOLISM_SEASON_FACTOR: Record<Season, number> = {
  spring: 1.0,
  summer: 1.05,
  autumn: 1.0,
  winter: 1.3,
};
