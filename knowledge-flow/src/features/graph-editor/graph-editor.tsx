"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiBaseUrl } from "@/lib/api/config";
import type { GraphDocument, GraphFieldError, GraphLayout } from "@/lib/graph/schema";
import { GraphViewer } from "./graph-viewer";
import { parseGraphJson } from "./parse-input";
import { sampleGraph, sampleGraphJson } from "./sample";

export function GraphEditor() {
  const router = useRouter();
  const [text, setText] = useState(sampleGraphJson);
  const [graph, setGraph] = useState<GraphDocument>(sampleGraph);
  const [errors, setErrors] = useState<GraphFieldError[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const result = parseGraphJson(text);
      if (result.success) {
        setGraph(result.data);
        setErrors([]);
      }
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [text]);

  function generatePreview() {
    const result = parseGraphJson(text);
    if (!result.success) {
      setErrors(result.errors);
      return null;
    }
    setErrors([]);
    setGraph(result.data);
    return result.data;
  }

  function changeLayout(layout: GraphLayout) {
    const next = { ...graph, layout };
    setGraph(next);
    setText(JSON.stringify(next, null, 2));
  }

  async function save() {
    const currentGraph = generatePreview();
    if (!currentGraph) return;

    setSaving(true);
    setSaveError("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/graphs`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(currentGraph),
      });
      const body = await response.json();
      if (!response.ok) {
        const fields = Array.isArray(body.error?.fields) ? body.error.fields : [];
        if (fields.length > 0) setErrors(fields);
        setSaveError(body.error?.message ?? "保存失败，请重试");
        return;
      }
      router.push(`/graphs/${body.graph.id}`);
      router.refresh();
    } catch {
      setSaveError("网络连接失败，当前输入已保留，请重试。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-white">结构化 JSON</h2>
            <p className="mt-1 text-xs text-slate-400">编辑后自动刷新右侧星图</p>
          </div>
          <button
            type="button"
            onClick={() => setText(sampleGraphJson)}
            className="text-xs font-semibold text-indigo-300 hover:text-indigo-100"
          >
            填入示例
          </button>
        </div>
        <textarea
          aria-label="图谱 JSON"
          value={text}
          onChange={(event) => setText(event.target.value)}
          spellCheck={false}
          className="mt-4 h-[480px] w-full resize-y rounded-xl border border-white/10 bg-black/50 p-4 font-mono text-xs leading-5 text-indigo-100 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20"
        />

        {errors.length > 0 && (
          <div role="alert" className="mt-4 rounded-xl bg-rose-500/10 p-4">
            <p className="text-sm font-semibold text-rose-200">请修正以下字段</p>
            <ul className="mt-2 space-y-1 text-xs text-rose-300">
              {errors.map((error, index) => (
                <li key={`${error.path}-${index}`}>
                  <code>{error.path}</code>：{error.message}
                </li>
              ))}
            </ul>
          </div>
        )}
        {saveError && (
          <p role="alert" className="mt-4 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-200">
            {saveError}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={generatePreview}
            className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/5"
          >
            生成预览
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(99,102,241,0.45)] hover:bg-indigo-400 disabled:opacity-60"
          >
            {saving ? "保存中…" : "保存图谱"}
          </button>
        </div>
      </section>

      <section className="min-w-0">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-indigo-300">
              LIVE CONSTELLATION
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">{graph.title}</h1>
          </div>
          <p className="text-xs text-slate-400">
            {graph.nodes.length} 个节点 · {graph.edges.length} 条连线
          </p>
        </div>
        <GraphViewer graph={graph} onLayoutChange={changeLayout} />
      </section>
    </div>
  );
}
