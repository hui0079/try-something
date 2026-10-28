import type { Severity } from "@/lib/sim/events";
import type { ActionKind, DeathCause } from "@/lib/sim/types";

export const ACTION_LABEL: Record<ActionKind, string> = {
  eat: "进食",
  fetchWater: "取水",
  farm: "耕作",
  hunt: "狩猎",
  forage: "采集",
  build: "营建",
  mine: "采石",
  gatherSalt: "取盐",
  socialize: "往来",
  pray: "祈祷",
  rest: "休息",
  migrate: "迁徙",
  leave: "离去",
};

export const CAUSE_LABEL: Record<DeathCause, string> = {
  starvation: "饥荒",
  thirst: "干渴",
  cold: "寒冷",
  plague: "疫病",
  beast: "野兽",
  age: "年迈",
  frailty: "体弱",
  battle: "战死",
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  minor: "全部",
  notable: "要事",
  major: "大事",
};

export const SEX_LABEL: Record<"m" | "f", string> = { m: "男", f: "女" };
