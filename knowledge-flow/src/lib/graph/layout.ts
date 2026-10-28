import dagre from "@dagrejs/dagre";
import { Position, type Edge } from "@xyflow/react";
import type { KnowledgeFlowNode } from "./adapter";
import type { GraphLayout } from "./schema";

const NODE_WIDTH = 240;
const NODE_HEIGHT = 112;

const rankDirections: Record<GraphLayout, "LR" | "TB" | "RL" | "BT"> = {
  horizontal: "LR",
  vertical: "TB",
  "horizontal-reverse": "RL",
  "vertical-reverse": "BT",
};

export function layoutHandlePositions(layout: GraphLayout = "horizontal"): {
  sourcePosition: Position;
  targetPosition: Position;
} {
  switch (layout) {
    case "vertical":
      return { sourcePosition: Position.Bottom, targetPosition: Position.Top };
    case "horizontal-reverse":
      return { sourcePosition: Position.Left, targetPosition: Position.Right };
    case "vertical-reverse":
      return { sourcePosition: Position.Top, targetPosition: Position.Bottom };
    default:
      return { sourcePosition: Position.Right, targetPosition: Position.Left };
  }
}

export function layoutGraph(
  nodes: KnowledgeFlowNode[],
  edges: Edge[],
  layout: GraphLayout = "horizontal",
): { nodes: KnowledgeFlowNode[]; edges: Edge[] } {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: rankDirections[layout] ?? "LR",
    ranksep: layout.startsWith("vertical") ? 72 : 96,
    nodesep: layout.startsWith("vertical") ? 40 : 48,
    marginx: 24,
    marginy: 24,
  });

  nodes.forEach((node) => {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });
  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph);
  const handles = layoutHandlePositions(layout);

  return {
    nodes: nodes.map((node) => {
      const position = graph.node(node.id);
      return {
        ...node,
        ...handles,
        position: {
          x: position.x - NODE_WIDTH / 2,
          y: position.y - NODE_HEIGHT / 2,
        },
      };
    }),
    edges,
  };
}
