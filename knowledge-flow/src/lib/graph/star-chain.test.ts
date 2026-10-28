import { describe, expect, it } from "vitest";
import type { GraphDocument } from "./schema";
import {
  knowledgeStarPositions,
  latLonToVec,
  orientPoint,
  projectPoint,
  relatedKnowledgePairs,
  rotateY,
  sphereArc,
  tokenizeKnowledge,
  unorientPoint,
  unprojectToSphere,
  vecLength,
} from "./star-chain";

const graph = (title: string, technologies: string[]): GraphDocument => ({
  version: 1,
  title,
  layout: "horizontal",
  nodes: [
    {
      id: "n1",
      type: "technology",
      label: title,
      description: "节点说明",
      technologies,
      conditions: [],
    },
  ],
  edges: [],
});

describe("relatedKnowledgePairs", () => {
  it("connects graphs that share a technology", () => {
    const pairs = relatedKnowledgePairs([
      { id: "a", title: "登录方案", content: graph("登录方案", ["Spring Security"]) },
      { id: "b", title: "权限模型", content: graph("权限模型", ["Spring Security"]) },
      { id: "c", title: "前端布局", content: graph("前端布局", ["Tailwind"]) },
    ]);
    expect(pairs).toEqual([["a", "b"]]);
  });

  it("does not connect unrelated knowledge", () => {
    const pairs = relatedKnowledgePairs([
      { id: "a", title: "构建脚本", content: graph("构建脚本", ["Maven"]) },
      { id: "b", title: "样式系统", content: graph("样式系统", ["Tailwind"]) },
    ]);
    expect(pairs).toEqual([]);
  });
});

describe("tokenizeKnowledge", () => {
  it("keeps meaningful tokens and drops stop words", () => {
    const tokens = tokenizeKnowledge("使用 Spring 进行登录", graph("登录", ["Spring"]));
    expect(tokens.has("spring")).toBe(true);
    expect(tokens.has("使用")).toBe(false);
  });
});

describe("projectPoint", () => {
  it("maps a rotated 3D point onto the canvas", () => {
    const rotated = rotateY(latLonToVec(0, 0, 1), Math.PI / 2);
    const projected = projectPoint(rotated, 200, 200, 180);
    expect(Number.isFinite(projected.x)).toBe(true);
    expect(projected.depth).toBeGreaterThan(0);
  });
});

describe("knowledgeStarPositions", () => {
  it("places one orbital point per knowledge graph", () => {
    const placed = knowledgeStarPositions([
      { id: "a", title: "登录方案", content: graph("登录方案", ["Spring"]) },
      { id: "b", title: "权限模型", content: graph("权限模型", ["Spring"]) },
    ]);
    expect(placed).toHaveLength(2);
    expect(placed.map((item) => item.id)).toEqual(["a", "b"]);
    expect(placed.every((item) => Number.isFinite(item.position.x))).toBe(true);
  });
});

describe("sphere dragging", () => {
  const radius = 1.78;
  const cx = 400;
  const cy = 310;
  const scale = 200;

  it("inverts orientation so a dragged point can be stored on the spinning globe", () => {
    const original = latLonToVec(0.4, 1.1, radius);
    const oriented = orientPoint(original, -0.38, 0.7);
    const restored = unorientPoint(oriented, -0.38, 0.7);
    expect(restored.x).toBeCloseTo(original.x, 5);
    expect(restored.y).toBeCloseTo(original.y, 5);
    expect(restored.z).toBeCloseTo(original.z, 5);
  });

  it("projects a front-facing shell point back onto the same sphere", () => {
    const viewPoint = { x: 0.2, y: 0.4, z: Math.sqrt(radius ** 2 - 0.2 ** 2 - 0.4 ** 2) };
    const projected = projectPoint(viewPoint, cx, cy, scale);
    const hit = unprojectToSphere(projected.x, projected.y, cx, cy, scale, radius);
    expect(vecLength(hit)).toBeCloseTo(radius, 5);
    expect(hit.x).toBeCloseTo(viewPoint.x, 4);
    expect(hit.y).toBeCloseTo(viewPoint.y, 4);
    expect(hit.z).toBeCloseTo(viewPoint.z, 4);
  });

  it("keeps a pointer outside the globe on the rotating shell instead of leaving it", () => {
    const hit = unprojectToSphere(cx + 800, cy - 600, cx, cy, scale, radius);
    expect(vecLength(hit)).toBeCloseTo(radius, 5);
    expect(hit.z).toBeGreaterThan(0);
  });
});

describe("sphereArc", () => {
  it("follows the globe surface instead of a straight chord", () => {
    const radius = 1.78;
    const from = latLonToVec(0.1, 0, radius);
    const to = latLonToVec(0.1, 1.4, radius);
    const arc = sphereArc(from, to, 8);

    expect(arc[0]).toEqual(from);
    expect(arc.at(-1)).toEqual(to);
    expect(arc.every((point) => Math.abs(vecLength(point) - radius) < 1e-6)).toBe(true);

    const midArc = arc[4];
    const midChord = {
      x: (from.x + to.x) / 2,
      y: (from.y + to.y) / 2,
      z: (from.z + to.z) / 2,
    };
    expect(vecLength(midArc)).toBeGreaterThan(vecLength(midChord));
  });
});
