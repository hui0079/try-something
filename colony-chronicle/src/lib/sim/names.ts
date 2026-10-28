import type { Rng } from "./rng";
import type { SkillKey, Villager } from "./types";

const CLANS = [
  "石",
  "林",
  "河",
  "桑",
  "岩",
  "苇",
  "灰",
  "原",
  "松",
  "白",
  "陶",
  "霜",
  "野",
  "溪",
  "岭",
] as const;

const GIVEN = [
  "禾",
  "荻",
  "砚",
  "槐",
  "麦",
  "苗",
  "樵",
  "渠",
  "燧",
  "瓮",
  "篱",
  "岫",
  "汀",
  "舟",
  "弓",
  "斧",
  "瓢",
  "罐",
  "绳",
  "网",
  "火",
  "盐",
  "井",
  "犁",
  "镰",
  "锤",
  "针",
  "线",
  "鹿",
  "雀",
  "隼",
  "狐",
  "熊",
  "雁",
  "蝉",
  "萤",
  "苔",
  "藤",
  "泉",
  "垚",
] as const;

/** Draws a name not already in `taken`, falling back to a numbered suffix. */
export function makeName(rng: Rng, taken: ReadonlySet<string>): string {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const name = `${rng.pick(CLANS)}${rng.pick(GIVEN)}`;
    if (!taken.has(name)) return name;
  }
  let suffix = 2;
  const base = `${rng.pick(CLANS)}${rng.pick(GIVEN)}`;
  while (taken.has(`${base}${suffix}`)) suffix += 1;
  return `${base}${suffix}`;
}

export function takenNames(
  villagers: readonly Villager[],
  graves: readonly { name: string }[],
  kin: readonly { name: string }[] = [],
): Set<string> {
  const set = new Set<string>();
  for (const v of villagers) set.add(v.name);
  for (const g of graves) set.add(g.name);
  for (const person of kin) set.add(person.name);
  return set;
}

const SKILL_TITLE: Record<SkillKey, string> = {
  farming: "农人",
  hunting: "猎手",
  crafting: "匠人",
  healing: "医者",
};

/** A one-word role used in narration, derived from whatever they are best at. */
export function titleOf(villager: Pick<Villager, "age" | "skills">): string {
  if (villager.age < 14) return "孩子";
  let best: SkillKey = "farming";
  for (const key of Object.keys(villager.skills) as SkillKey[]) {
    if (villager.skills[key] > villager.skills[best]) best = key;
  }
  if (villager.skills[best] < 25) return villager.age >= 55 ? "长者" : "村人";
  return SKILL_TITLE[best];
}

export const SKILL_LABEL = SKILL_TITLE;
