export function formatCount(value: unknown): string | undefined {
  const count =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(count) || count < 0) {
    return undefined;
  }

  if (count >= 10_000) {
    const wan = Math.round((count / 10_000) * 10) / 10;
    return `${wan.toLocaleString("zh-CN", { maximumFractionDigits: 1 })} 万`;
  }

  return Math.round(count).toLocaleString("zh-CN");
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
