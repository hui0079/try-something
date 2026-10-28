import { describe, expect, it } from "vitest";
import { countNodeTypes, summarizeLibrary } from "./visual";

describe("countNodeTypes", () => {
  it("groups graph nodes by type for HUD bands", () => {
    const counts = countNodeTypes([
      { type: "step" },
      { type: "step" },
      { type: "risk" },
      { type: "result" },
    ]);

    expect(counts).toEqual([
      expect.objectContaining({ type: "step", count: 2 }),
      expect.objectContaining({ type: "risk", count: 1 }),
      expect.objectContaining({ type: "result", count: 1 }),
    ]);
  });
});

describe("summarizeLibrary", () => {
  it("totals graphs, nodes and edges", () => {
    const summary = summarizeLibrary([
      {
        content: {
          version: 1,
          title: "A",
          layout: "horizontal",
          nodes: [
            {
              id: "a",
              type: "start",
              label: "A",
              description: "A",
              technologies: [],
              conditions: [],
            },
          ],
          edges: [],
        },
      },
      {
        content: {
          version: 1,
          title: "B",
          layout: "horizontal",
          nodes: [
            {
              id: "b",
              type: "start",
              label: "B",
              description: "B",
              technologies: [],
              conditions: [],
            },
            {
              id: "c",
              type: "result",
              label: "C",
              description: "C",
              technologies: [],
              conditions: [],
            },
          ],
          edges: [{ id: "e", source: "b", target: "c" }],
        },
      },
    ]);

    expect(summary).toMatchObject({
      graphCount: 2,
      nodeCount: 3,
      edgeCount: 1,
    });
    expect(summary.types.map((item) => item.type)).toEqual(["start", "result"]);
  });
});
