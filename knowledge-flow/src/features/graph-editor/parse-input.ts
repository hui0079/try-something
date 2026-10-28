import {
  parseGraphInput,
  type GraphParseResult,
} from "@/lib/graph/schema";

export function parseGraphJson(text: string): GraphParseResult {
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    return {
      success: false,
      errors: [{ path: "json", message: "JSON 格式不正确" }],
    };
  }

  return parseGraphInput(input);
}
