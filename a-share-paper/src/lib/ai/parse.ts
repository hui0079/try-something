import type { OrderRequest } from "@/lib/broker/apply";

export type ParsedDecision = {
  summary: string;
  logic: string;
  actions: OrderRequest[];
};

export function parseDecision(text: string): ParsedDecision | { error: string } {
  const jsonText = extractJson(text);
  if (!jsonText) return { error: "没有 JSON" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { error: "JSON 无法解析" };
  }
  if (!isRecord(parsed) || typeof parsed.summary !== "string" || typeof parsed.logic !== "string" || !Array.isArray(parsed.actions)) {
    return { error: "JSON 结构不对" };
  }
  const logic = parsed.logic.trim();
  if (!logic) return { error: "没有选股逻辑" };
  const actions: OrderRequest[] = [];
  for (const action of parsed.actions) {
    if (!isRecord(action)) return { error: "JSON 结构不对" };
    if (action.side === "hold") continue;
    if (action.side !== "buy" && action.side !== "sell") return { error: "方向不合法" };
    if (typeof action.code !== "string" || typeof action.reason !== "string") {
      return { error: "JSON 结构不对" };
    }
    const lots = typeof action.lots === "number" ? action.lots : Number(action.lots);
    if (!Number.isInteger(lots)) return { error: "手数不合法" };
    actions.push({ code: action.code, side: action.side, lots, reason: action.reason });
  }
  return { summary: parsed.summary, logic, actions };
}

function extractJson(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return text.slice(start, index + 1);
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
