export const DEFAULT_WATCHLIST = [
  "600519",
  "601318",
  "600036",
  "000858",
  "000333",
  "002594",
  "600900",
  "601899",
];

const CODE = /^(?:000|001|002|003|300|301|600|601|603|605|688|689)\d{3}$/;

export function isSupportedCode(code: string): boolean {
  return CODE.test(code);
}

export function normalizeWatchlist(codes: string[]): { codes: string[] } | { error: string } {
  const unique: string[] = [];
  for (const raw of codes) {
    const code = raw.trim();
    if (!code) continue;
    if (!CODE.test(code)) return { error: `不支持的代码 ${code}` };
    if (!unique.includes(code)) unique.push(code);
  }
  if (unique.length > 10) return { error: "自选最多 10 只" };
  return { codes: unique };
}
