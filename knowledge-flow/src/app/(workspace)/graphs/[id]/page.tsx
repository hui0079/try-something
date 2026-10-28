import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GraphViewer } from "@/features/graph-editor/graph-viewer";
import { DeleteGraphButton } from "@/features/graphs/delete-graph-button";
import { apiFetch } from "@/lib/api/server";
import type { StoredGraph } from "@/lib/api/types";
import { countNodeTypes } from "@/lib/graph/visual";

export const dynamic = "force-dynamic";

export default async function GraphDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const response = await apiFetch(`/api/graphs/${(await params).id}`);
  if (response.status === 401) redirect("/login");
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error("无法加载图谱");

  const { graph } = (await response.json()) as { graph: StoredGraph };
  const types = countNodeTypes(graph.content.nodes);

  return (
    <main className="mx-auto max-w-[1600px] px-5 py-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <Link
            href="/graphs"
            className="text-sm font-medium text-slate-400 hover:text-white"
          >
            ← 返回星图库
          </Link>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
            {graph.title}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {graph.content.nodes.length} 个节点 · {graph.content.edges.length} 条连线
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {types.map((item) => (
              <span
                key={item.type}
                className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-200"
                style={{ boxShadow: `0 0 12px ${item.hex}55` }}
              >
                {item.label} {item.count}
              </span>
            ))}
          </div>
        </div>
        <DeleteGraphButton graphId={graph.id} redirectAfterDelete />
      </div>
      <div className="h-[calc(100vh-220px)] min-h-[560px]">
        <GraphViewer graph={graph.content} />
      </div>
    </main>
  );
}
