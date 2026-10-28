export const OPEN_QUOTE_GAP_MS = 20_000;
export const QUOTE_GAP_CAP_MS = 3 * 60_000;
export const QUOTE_HOLD_MS = 3 * 60_000;

export function nextQuoteGapMs(failures: number): number {
  if (failures <= 0) return OPEN_QUOTE_GAP_MS;
  return Math.min(OPEN_QUOTE_GAP_MS * 2 ** failures, QUOTE_GAP_CAP_MS);
}
