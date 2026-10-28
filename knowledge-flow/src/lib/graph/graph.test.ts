import { describe, expect, it } from "vitest";
import { parseGraphInput } from "./schema";
import { graphToFlowElements } from "./adapter";
import { layoutGraph } from "./layout";

const validGraph = {
  version: 1,
  title: "部署一个 Web 应用",
  nodes: [
    {
      id: "start",
      type: "step",
      label: "准备代码",
      description: "将项目代码提交到 Git。",
    },
    {
      id: "hosting",
      type: "technology",
      label: "Vercel",
      description: "托管 Next.js 应用。",
      technologies: ["Next.js", "Vercel"],
    },
  ],
  edges: [
    {
      id: "start-hosting",
      source: "start",
      target: "hosting",
      label: "然后",
    },
  ],
} as const;

describe("parseGraphInput", () => {
  it("accepts a valid versioned graph", () => {
    const result = parseGraphInput(validGraph);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("部署一个 Web 应用");
    }
  });

  it("accepts the expanded node kinds used in knowledge flows", () => {
    const result = parseGraphInput({
      version: 1,
      title: "多种节点",
      nodes: [
        { id: "s", type: "start", label: "入口", description: "从需求开始" },
        { id: "p", type: "problem", label: "问题", description: "要解决登录" },
        { id: "a", type: "alternative", label: "备选", description: "也可以用 JWT" },
        { id: "t", type: "tool", label: "工具", description: "Maven 构建" },
        { id: "d", type: "data", label: "数据", description: "用户表" },
        { id: "i", type: "api", label: "接口", description: "登录 API" },
        { id: "r", type: "risk", label: "风险", description: "明文密码" },
        { id: "f", type: "reference", label: "参考", description: "Spring Security 文档" },
      ],
      edges: [],
    });

    expect(result.success).toBe(true);
  });

  it("reports duplicate node ids and dangling edge references", () => {
    const result = parseGraphInput({
      ...validGraph,
      nodes: [validGraph.nodes[0], validGraph.nodes[0]],
      edges: [{ id: "broken", source: "start", target: "missing" }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: "nodes.1.id" }),
          expect.objectContaining({ path: "edges.0.target" }),
        ]),
      );
    }
  });
});

describe("graphToFlowElements", () => {
  it("preserves graph details in React Flow node data", () => {
    const parsed = parseGraphInput(validGraph);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const flow = graphToFlowElements(parsed.data);

    expect(flow.nodes[1]).toMatchObject({
      id: "hosting",
      type: "knowledge",
      data: {
        label: "Vercel",
        kind: "technology",
        technologies: ["Next.js", "Vercel"],
      },
    });
    expect(flow.edges[0]).toMatchObject({
      id: "start-hosting",
      source: "start",
      target: "hosting",
      label: "然后",
      animated: true,
    });
  });
});

describe("layoutGraph", () => {
  it("places connected nodes from left to right", () => {
    const parsed = parseGraphInput(validGraph);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const flow = graphToFlowElements(parsed.data);
    const laidOut = layoutGraph(flow.nodes, flow.edges);

    expect(laidOut.nodes[1].position.x).toBeGreaterThan(
      laidOut.nodes[0].position.x,
    );
    expect(laidOut.nodes.every((node) => Number.isFinite(node.position.y))).toBe(
      true,
    );
  });

  it("places connected nodes from top to bottom in vertical layout", () => {
    const parsed = parseGraphInput({ ...validGraph, layout: "vertical" });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const flow = graphToFlowElements(parsed.data);
    const laidOut = layoutGraph(flow.nodes, flow.edges, "vertical");

    expect(laidOut.nodes[1].position.y).toBeGreaterThan(
      laidOut.nodes[0].position.y,
    );
  });

  it("defaults omitted layout to horizontal", () => {
    const result = parseGraphInput(validGraph);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.layout).toBe("horizontal");
  });
});
