import { describe, expect, it } from "vitest";

import { parseDecision } from "@/lib/ai/parse";

describe("parseDecision", () => {
  it("reads a fenced JSON decision and skips holds", () => {
    const parsed = parseDecision(`说明
\`\`\`json
{"summary":"先看茅台","logic":"榜单里只拿低开的茅台","actions":[{"code":"600519","side":"buy","lots":1,"reason":"低开"},{"code":"601318","side":"hold","lots":0,"reason":"不动"}]}
\`\`\``);
    expect(parsed).toEqual({
      summary: "先看茅台",
      logic: "榜单里只拿低开的茅台",
      actions: [{ code: "600519", side: "buy", lots: 1, reason: "低开" }],
    });
  });

  it("rejects text that is not the expected object", () => {
    expect(parseDecision("今天不交易")).toEqual({ error: "没有 JSON" });
    expect(parseDecision('{"summary":1,"actions":[]}')).toEqual({ error: "JSON 结构不对" });
  });
});
