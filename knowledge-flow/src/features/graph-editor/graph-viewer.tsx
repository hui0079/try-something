"use client";

import { useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type NodeMouseHandler,
  type NodeTypes,
} from "@xyflow/react";
import { graphToFlowElements, type KnowledgeFlowNode } from "@/lib/graph/adapter";
import { layoutGraph } from "@/lib/graph/layout";
import {
  graphLayoutLabels,
  graphLayoutTypes,
  graphNodeTypeLabels,
  type GraphDocument,
  type GraphLayout,
} from "@/lib/graph/schema";
import { countNodeTypes, graphNodeColors } from "@/lib/graph/visual";
import { KnowledgeNode } from "./knowledge-node";

const nodeTypes: NodeTypes = { knowledge: KnowledgeNode };

export function GraphViewer({
  graph,
  onLayoutChange,
}: {
  graph: GraphDocument;
  onLayoutChange?: (layout: GraphLayout) => void;
}) {
  const [selected, setSelected] = useState<KnowledgeFlowNode | null>(null);
  const [previewLayout, setPreviewLayout] = useState<GraphLayout | null>(null);
  const layout = onLayoutChange
    ? (graph.layout ?? "horizontal")
    : (previewLayout ?? graph.layout ?? "horizontal");
  const typeCounts = useMemo(() => countNodeTypes(graph.nodes), [graph.nodes]);
  const elements = useMemo(() => {
    const flow = graphToFlowElements(graph);
    const laidOut = layoutGraph(flow.nodes, flow.edges, layout);
    if (!selected) return laidOut;
    return {
      nodes: laidOut.nodes,
      edges: laidOut.edges.map((edge) => {
        const active = edge.source === selected.id || edge.target === selected.id;
        return {
          ...edge,
          animated: true,
          style: {
            stroke: active ? "#f8fafc" : "#4338ca",
            strokeWidth: active ? 2.6 : 1.4,
            opacity: active ? 1 : 0.35,
          },
        };
      }),
    };
  }, [graph, layout, selected]);

  const handleNodeClick: NodeMouseHandler<KnowledgeFlowNode> = (_, node) => {
    setSelected(node);
  };

  function chooseLayout(next: GraphLayout) {
    if (onLayoutChange) onLayoutChange(next);
    else setPreviewLayout(next);
  }

  return (
    <div className="grid h-full min-h-[520px] grid-cols-1 overflow-hidden rounded-3xl border border-indigo-400/20 bg-[#070814]/70 lg:grid-cols-[1fr_300px]">
      <div className="starfield relative min-h-[480px]">
        <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1 rounded-xl border border-white/10 bg-slate-950/70 p-1 backdrop-blur-md">
          {graphLayoutTypes.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => chooseLayout(item)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                layout === item
                  ? "bg-indigo-500 text-white shadow-[0_0_16px_rgba(99,102,241,0.65)]"
                  : "text-slate-300 hover:bg-white/10"
              }`}
            >
              {graphLayoutLabels[item]}
            </button>
          ))}
        </div>
        <ReactFlow
          nodes={elements.nodes}
          edges={elements.edges}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          onPaneClick={() => setSelected(null)}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.25}
          maxZoom={1.8}
          nodesConnectable={false}
          colorMode="dark"
        >
          <Background gap={28} size={1} color="rgba(129,140,248,0.18)" />
          <MiniMap
            pannable
            zoomable
            maskColor="rgba(7,8,20,0.75)"
            nodeColor={(node) => {
              const kind = (node.data as KnowledgeFlowNode["data"] | undefined)?.kind;
              return kind ? graphNodeColors[kind].hex : "#818cf8";
            }}
          />
          <Controls />
        </ReactFlow>
      </div>

      <aside className="border-t border-indigo-400/15 bg-slate-950/80 p-5 lg:border-l lg:border-t-0">
        <p className="text-[10px] font-bold tracking-[0.22em] text-indigo-300">
          TYPE MIX
        </p>
        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-slate-800">
          {typeCounts.map((item) => (
            <span
              key={item.type}
              className="h-full"
              style={{ width: `${(item.count / graph.nodes.length) * 100}%`, background: item.hex }}
              title={`${item.label} ${item.count}`}
            />
          ))}
        </div>
        <ul className="mt-3 space-y-1.5">
          {typeCounts.map((item) => (
            <li key={item.type} className="flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-2">
                <i className="size-2 rounded-full" style={{ background: item.hex }} />
                {item.label}
              </span>
              <span className="font-semibold text-white">{item.count}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 border-t border-white/10 pt-5">
          {selected ? (
            <div>
              <p
                className="text-xs font-bold tracking-[0.18em]"
                style={{ color: graphNodeColors[selected.data.kind].hex }}
              >
                {graphNodeTypeLabels[selected.data.kind]}
              </p>
              <h2 className="mt-2 text-xl font-bold text-white">
                {selected.data.label}
              </h2>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                {selected.data.description}
              </p>
              {selected.data.technologies.length > 0 && (
                <DetailList title="使用技术" items={selected.data.technologies} />
              )}
              {selected.data.conditions.length > 0 && (
                <DetailList title="适用条件" items={selected.data.conditions} />
              )}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="font-semibold text-slate-100">点亮一个节点</p>
              <p className="mt-1 text-sm text-slate-400">连线会跟着高亮，侧栏显示详情</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="mt-6">
      <h3 className="text-[10px] font-semibold tracking-[0.18em] text-slate-400">
        {title}
      </h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-indigo-100"
          >
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
