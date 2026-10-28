import type { Edge, Node } from "@xyflow/react";
import type { GraphDocument, GraphNodeType } from "./schema";

export type KnowledgeNodeData = {
  label: string;
  kind: GraphNodeType;
  description: string;
  technologies: string[];
  conditions: string[];
  [key: string]: unknown;
};

export type KnowledgeFlowNode = Node<KnowledgeNodeData, "knowledge">;

export type FlowElements = {
  nodes: KnowledgeFlowNode[];
  edges: Edge[];
};

export function graphToFlowElements(graph: GraphDocument): FlowElements {
  return {
    nodes: graph.nodes.map((node) => ({
      id: node.id,
      type: "knowledge",
      position: { x: 0, y: 0 },
      data: {
        label: node.label,
        kind: node.type,
        description: node.description,
        technologies: node.technologies,
        conditions: node.conditions,
      },
    })),
    edges: graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: "smoothstep",
      animated: true,
      style: { stroke: "#818cf8", strokeWidth: 1.8 },
      labelStyle: { fill: "#c7d2fe", fontSize: 11, fontWeight: 600 },
      labelBgStyle: { fill: "#0f172a", fillOpacity: 0.75 },
      labelBgPadding: [6, 4] as [number, number],
      labelBgBorderRadius: 6,
    })),
  };
}
