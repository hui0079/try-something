import type { TrendItem } from "../types";

export function requireItems(name: string, items: TrendItem[]): TrendItem[] {
  if (items.length === 0) {
    throw new Error(`${name}没有可展示的数据`);
  }
  return items;
}
