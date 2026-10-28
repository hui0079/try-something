const DIGITS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

/** Chinese numerals for the small counts a chronicle actually needs. */
export function cnNumber(value: number): string {
  const n = Math.round(value);
  if (n < 0) return `负${cnNumber(-n)}`;
  if (n < 10) return DIGITS[n];
  if (n === 10) return "十";
  if (n < 20) return `十${DIGITS[n - 10]}`;
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return `${DIGITS[tens]}十${ones === 0 ? "" : DIGITS[ones]}`;
  }
  return String(n);
}

export function cnPeople(count: number): string {
  if (count === 1) return "一人";
  if (count === 2) return "两人";
  return `${cnNumber(count)}人`;
}

/**
 * Names read badly past three, so longer lists are summarised. `一人` alone is
 * left as the bare name.
 */
export function joinNames(names: readonly string[], limit = 3): string {
  if (names.length === 0) return "无人";
  if (names.length <= limit) return names.join("、");
  return `${names.slice(0, limit).join("、")}等${cnPeople(names.length)}`;
}

/** Rough quantities, because nobody in a village counts to one decimal place. */
export function cnAmount(value: number): string {
  if (value < 1) return "一点";
  if (value < 3) return "少许";
  if (value < 8) return cnNumber(Math.round(value)) + "份";
  if (value < 20) return `${cnNumber(Math.round(value))}份`;
  return `${Math.round(value)}份`;
}
