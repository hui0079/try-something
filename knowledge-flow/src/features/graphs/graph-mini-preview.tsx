import { graphToFlowElements } from "@/lib/graph/adapter";
import { layoutGraph } from "@/lib/graph/layout";
import type { GraphDocument } from "@/lib/graph/schema";
import { countNodeTypes, graphNodeColors } from "@/lib/graph/visual";

export function GraphMiniPreview({ graph }: { graph: GraphDocument }) {
  const flow = graphToFlowElements(graph);
  const laidOut = layoutGraph(flow.nodes, flow.edges, graph.layout ?? "horizontal");
  const xs = laidOut.nodes.map((node) => node.position.x);
  const ys = laidOut.nodes.map((node) => node.position.y);
  const minX = Math.min(...xs, 0);
  const minY = Math.min(...ys, 0);
  const maxX = Math.max(...xs, 240) + 240;
  const maxY = Math.max(...ys, 80) + 112;
  const types = countNodeTypes(graph.nodes);
  const nodeById = new Map(laidOut.nodes.map((node) => [node.id, node]));

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
      <svg viewBox={`${minX - 24} ${minY - 24} ${maxX - minX + 48} ${maxY - minY + 48}`} className="h-28 w-full">
        {laidOut.edges.map((edge) => {
          const source = nodeById.get(edge.source);
          const target = nodeById.get(edge.target);
          if (!source || !target) return null;
          return (
            <line
              key={edge.id}
              x1={source.position.x + 120}
              y1={source.position.y + 56}
              x2={target.position.x + 120}
              y2={target.position.y + 56}
              stroke="rgba(129,140,248,0.7)"
              strokeWidth="6"
            />
          );
        })}
        {laidOut.nodes.map((node) => (
          <circle
            key={node.id}
            cx={node.position.x + 120}
            cy={node.position.y + 56}
            r="18"
            fill={graphNodeColors[node.data.kind].hex}
          />
        ))}
      </svg>
      <div className="flex h-1.5">
        {types.map((item) => (
          <span
            key={item.type}
            className="h-full"
            style={{
              width: `${(item.count / graph.nodes.length) * 100}%`,
              background: item.hex,
            }}
          />
        ))}
      </div>
    </div>
  );
}
