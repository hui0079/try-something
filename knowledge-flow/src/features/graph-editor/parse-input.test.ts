import { describe, expect, it } from "vitest";
import { parseGraphJson } from "./parse-input";
import { sampleGraphJson } from "./sample";

describe("parseGraphJson", () => {
  it("reports malformed JSON without throwing", () => {
    const result = parseGraphJson("{not-json");

    expect(result).toEqual({
      success: false,
      errors: [{ path: "json", message: "JSON 格式不正确" }],
    });
  });

  it("returns field errors for a structurally invalid graph", () => {
    const result = parseGraphJson(
      JSON.stringify({ version: 1, title: "", nodes: [], edges: [] }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.map((error) => error.path)).toEqual(
        expect.arrayContaining(["title", "nodes"]),
      );
    }
  });

  it("returns a typed graph for valid JSON", () => {
    const result = parseGraphJson(
      JSON.stringify({
        version: 1,
        title: "示例",
        nodes: [
          {
            id: "one",
            type: "result",
            label: "完成",
            description: "得到结果",
          },
        ],
        edges: [],
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.nodes[0].conditions).toEqual([]);
  });

  it("accepts the built-in sample graph used by 填入示例", () => {
    const result = parseGraphJson(sampleGraphJson);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const payload = JSON.parse(JSON.stringify(result.data)) as Record<string, unknown>;
    expect(payload.version).toBe(1);
    expect(payload.layout).toBe("horizontal");
    expect(Array.isArray(payload.nodes)).toBe(true);
    expect((payload.nodes as unknown[]).length).toBe(11);
  });
});
