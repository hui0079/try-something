import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteGraphButton } from "@/features/graphs/delete-graph-button";
import { GraphMiniPreview } from "@/features/graphs/graph-mini-preview";
import { StarChain } from "@/features/graphs/star-chain";
import { apiFetch } from "@/lib/api/server";
import type { StoredGraph } from "@/lib/api/types";
import { summarizeLibrary } from "@/lib/graph/visual";

export const dynamic = "force-dynamic";

export default async function GraphsPage() {
  const response = await apiFetch("/api/graphs");
  if (response.status === 401) redirect("/login");
  if (!response.ok) throw new Error("无法加载图谱列表");
  const { graphs } = (await response.json()) as { graphs: StoredGraph[] };
  const summary = summarizeLibrary(graphs);

  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-indigo-300">
            KNOWLEDGE CONSTELLATION
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">
            我的知识星图
          </h1>
          <p className="mt-2 text-slate-400">路径、分支和技术选择，铺成一张会发光的图。</p>
        </div>
        <Link
          href="/graphs/new"
          className="shrink-0 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(99,102,241,0.55)] hover:bg-indigo-400"
        >
          新建图谱
        </Link>
      </div>

      <section className="mt-8 grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 sm:grid-cols-4">
        <Stat label="图谱" value={summary.graphCount} />
        <Stat label="节点" value={summary.nodeCount} />
        <Stat label="连线" value={summary.edgeCount} />
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] text-slate-400">TYPE MIX</p>
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-slate-900">
            {summary.types.length === 0 ? (
              <span className="h-full w-full bg-slate-800" />
            ) : (
              summary.types.map((item) => (
                <span
                  key={item.type}
                  className="h-full"
                  style={{
                    width: `${(item.count / summary.nodeCount) * 100}%`,
                    background: item.hex,
                  }}
                />
              ))
            )}
          </div>
        </div>
      </section>

      <StarChain
        graphs={graphs.map((graph) => ({
          id: graph.id,
          title: graph.title,
          content: graph.content,
        }))}
      />

      {graphs.length === 0 ? (
        <section className="mt-12 rounded-3xl border border-dashed border-indigo-400/30 bg-slate-950/50 px-6 py-20 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-indigo-500/20 text-2xl text-indigo-200 shadow-[0_0_24px_rgba(99,102,241,0.45)]">
            ✦
          </div>
          <h2 className="mt-5 text-lg font-bold text-white">星图还是空的</h2>
          <p className="mt-2 text-sm text-slate-400">
            粘贴一段符合协议的 JSON，点亮第一张知识路径。
          </p>
          <Link
            href="/graphs/new"
            className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950"
          >
            开始创建
          </Link>
        </section>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {graphs.map((graph) => (
            <article
              key={graph.id}
              className="group overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60 transition hover:-translate-y-1 hover:border-indigo-400/40 hover:shadow-[0_0_32px_rgba(99,102,241,0.25)]"
            >
              <Link href={`/graphs/${graph.id}`} className="block p-4">
                <GraphMiniPreview graph={graph.content} />
                <div className="mt-4 flex items-start justify-between">
                  <span className="rounded-lg bg-indigo-500/15 px-2 py-1 text-xs font-semibold text-indigo-200">
                    {graph.content.nodes.length} 个节点
                  </span>
                  <span className="text-indigo-300/60 transition group-hover:text-indigo-200">
                    ↗
                  </span>
                </div>
                <h2 className="mt-3 line-clamp-2 text-lg font-bold text-white">
                  {graph.title}
                </h2>
                <p className="mt-2 text-xs text-slate-500">
                  更新于{" "}
                  {new Intl.DateTimeFormat("zh-CN", {
                    dateStyle: "medium",
                  }).format(new Date(graph.updatedAt))}
                </p>
              </Link>
              <div className="border-t border-white/10 px-2 py-1">
                <DeleteGraphButton graphId={graph.id} />
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[10px] font-bold tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}
