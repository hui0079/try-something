import {
  graphNodeTypes,
  graphNodeTypeLabels,
  type GraphDocument,
  type GraphNodeType,
} from "./schema";

export const graphNodeColors: Record<
  GraphNodeType,
  { glow: string; text: string; hex: string }
> = {
  start: { glow: "shadow-[0_0_24px_rgba(148,163,184,0.45)]", text: "text-slate-200", hex: "#94a3b8" },
  step: { glow: "shadow-[0_0_24px_rgba(129,140,248,0.55)]", text: "text-indigo-200", hex: "#818cf8" },
  problem: { glow: "shadow-[0_0_24px_rgba(251,113,133,0.5)]", text: "text-rose-200", hex: "#fb7185" },
  condition: { glow: "shadow-[0_0_24px_rgba(251,191,36,0.45)]", text: "text-amber-200", hex: "#fbbf24" },
  technology: { glow: "shadow-[0_0_24px_rgba(56,189,248,0.5)]", text: "text-sky-200", hex: "#38bdf8" },
  tool: { glow: "shadow-[0_0_24px_rgba(34,211,238,0.5)]", text: "text-cyan-200", hex: "#22d3ee" },
  data: { glow: "shadow-[0_0_24px_rgba(167,139,250,0.5)]", text: "text-violet-200", hex: "#a78bfa" },
  api: { glow: "shadow-[0_0_24px_rgba(232,121,249,0.5)]", text: "text-fuchsia-200", hex: "#e879f9" },
  alternative: { glow: "shadow-[0_0_24px_rgba(251,146,60,0.5)]", text: "text-orange-200", hex: "#fb923c" },
  risk: { glow: "shadow-[0_0_24px_rgba(248,113,113,0.5)]", text: "text-red-200", hex: "#f87171" },
  reference: { glow: "shadow-[0_0_24px_rgba(168,162,158,0.4)]", text: "text-stone-200", hex: "#a8a29e" },
  result: { glow: "shadow-[0_0_24px_rgba(52,211,153,0.5)]", text: "text-emerald-200", hex: "#34d399" },
};

export const graphNodeTypeIcons: Record<GraphNodeType, string> = {
  start: "●",
  step: "→",
  problem: "!",
  condition: "?",
  technology: "⌘",
  tool: "⚒",
  data: "▣",
  api: "⇄",
  alternative: "↺",
  risk: "⚠",
  reference: "※",
  result: "★",
};

export type TypeCount = {
  type: GraphNodeType;
  label: string;
  count: number;
  hex: string;
};

export function countNodeTypes(
  nodes: { type?: GraphNodeType; data?: { kind: GraphNodeType } }[],
): TypeCount[] {
  const counts = new Map<GraphNodeType, number>();
  for (const node of nodes) {
    const type = node.type && graphNodeTypes.includes(node.type as GraphNodeType)
      ? (node.type as GraphNodeType)
      : node.data?.kind;
    if (!type) continue;
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }

  return graphNodeTypes
    .map((type) => ({
      type,
      label: graphNodeTypeLabels[type],
      count: counts.get(type) ?? 0,
      hex: graphNodeColors[type].hex,
    }))
    .filter((item) => item.count > 0);
}

export function summarizeLibrary(
  graphs: { content: GraphDocument }[],
): {
  graphCount: number;
  nodeCount: number;
  edgeCount: number;
  types: TypeCount[];
} {
  const nodes = graphs.flatMap((graph) => graph.content.nodes);
  return {
    graphCount: graphs.length,
    nodeCount: nodes.length,
    edgeCount: graphs.reduce((sum, graph) => sum + graph.content.edges.length, 0),
    types: countNodeTypes(nodes),
  };
}
