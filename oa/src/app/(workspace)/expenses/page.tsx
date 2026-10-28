import Link from "next/link";
import { apiFetch } from "@/lib/api/server";
import { documentStatusLabel, expenseCategoryLabel, statusClass } from "@/lib/labels";
import type { ExpenseRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const response = await apiFetch("/api/expenses/mine");
  if (!response.ok) throw new Error("无法加载报销单");
  const expenses = (await response.json()) as ExpenseRequest[];

  return (
    <main>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">我的报销</h1>
        <Link href="/expenses/new" className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white">
          新建
        </Link>
      </div>
      {expenses.length === 0 ? (
        <p className="text-sm text-slate-500">还没有报销单。</p>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {expenses.map((expense) => (
            <li key={expense.id}>
              <Link href={`/expenses/${expense.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
                <span>
                  {expenseCategoryLabel[expense.category]} · {expense.amount} 元
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${statusClass(expense.status)}`}>
                  {documentStatusLabel[expense.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
