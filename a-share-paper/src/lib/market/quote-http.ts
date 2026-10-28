export const QUOTE_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export function toExchangeSymbol(code: string): string {
  const market = code.startsWith("6") || code.startsWith("9") ? "sh" : "sz";
  return `${market}${code}`;
}

export async function readGbk(response: Response): Promise<string> {
  const bytes = new Uint8Array(await response.arrayBuffer());
  return new TextDecoder("gbk").decode(bytes);
}

export function numberOrZero(value: string | undefined): number {
  if (!value || value === "-") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
