import Link from "next/link";
import { GraphEditor } from "@/features/graph-editor/graph-editor";

export default function NewGraphPage() {
  return (
    <main className="mx-auto max-w-[1600px] px-5 py-8">
      <Link
        href="/graphs"
        className="mb-5 inline-flex text-sm font-medium text-slate-400 hover:text-white"
      >
        ← 返回星图库
      </Link>
      <GraphEditor />
    </main>
  );
}
