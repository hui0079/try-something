import Link from "next/link";
import { redirect } from "next/navigation";
import { DecisionForm } from "@/features/tasks/decision-form";
import { apiFetch } from "@/lib/api/server";
import { stepLabel } from "@/lib/labels";
import type { CurrentUser, DirectoryUser, TodoItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TodosPage() {
  const [response, meResponse, directoryResponse] = await Promise.all([
    apiFetch("/api/tasks"),
    apiFetch("/api/auth/me"),
    apiFetch("/api/directory"),
  ]);
  if (response.status === 401 || meResponse.status === 401 || directoryResponse.status === 401) {
    redirect("/login");
  }
  if (!response.ok || !meResponse.ok || !directoryResponse.ok) throw new Error("无法加载待办");
  const todos = (await response.json()) as TodoItem[];
  const me = (await meResponse.json()) as CurrentUser;
  const directory = (await directoryResponse.json()) as DirectoryUser[];
  const people = directory.filter((person) => person.id !== me.id);

  return (
    <main>
      <h1 className="mb-4 text-2xl font-semibold">待办</h1>
      {todos.length === 0 ? (
        <p className="text-sm text-slate-500">没有待处理的审批。</p>
      ) : (
        <ul className="space-y-3">
          {todos.map((todo) => (
            <li key={todo.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <Link
                  href={todo.bizType === "LEAVE" ? `/leaves/${todo.bizId}` : `/expenses/${todo.bizId}`}
                  className="font-medium hover:underline"
                >
                  {todo.applicantName}的{todo.title}
                </Link>
                <span className="text-sm text-slate-500">
                  {todo.summary} · {stepLabel[todo.stepCode]}
                </span>
              </div>
              <DecisionForm taskId={todo.id} people={people} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
