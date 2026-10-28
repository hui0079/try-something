"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { KnowledgeFlowNode } from "@/lib/graph/adapter";
import { graphNodeTypeLabels } from "@/lib/graph/schema";
import { graphNodeColors, graphNodeTypeIcons } from "@/lib/graph/visual";

export function KnowledgeNode({
  data,
  selected,
  sourcePosition = Position.Right,
  targetPosition = Position.Left,
}: NodeProps<KnowledgeFlowNode>) {
  const kind = data.kind;
  const palette = graphNodeColors[kind];
  return (
    <article
      className={`w-60 rounded-2xl border p-4 backdrop-blur-md transition ${palette.glow} ${
        selected
          ? "border-white/80 ring-2 ring-white/40"
          : "border-white/15"
      }`}
      style={{
        background: `linear-gradient(165deg, ${palette.hex}33, rgba(7,8,20,0.92) 55%)`,
      }}
    >
      <Handle type="target" position={targetPosition} className="!size-2.5 !border-0" style={{ background: palette.hex }} />
      <div className="flex items-center gap-2">
        <span
          className="grid size-7 place-items-center rounded-lg text-sm font-bold"
          style={{ background: `${palette.hex}33`, color: palette.hex }}
        >
          {graphNodeTypeIcons[kind]}
        </span>
        <span className={`text-[10px] font-bold tracking-[0.18em] ${palette.text}`}>
          {graphNodeTypeLabels[kind]}
        </span>
      </div>
      <h3 className="mt-3 text-sm font-bold text-white">{data.label}</h3>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-300">
        {data.description}
      </p>
      <Handle type="source" position={sourcePosition} className="!size-2.5 !border-0" style={{ background: palette.hex }} />
    </article>
  );
}
