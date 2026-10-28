"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { clientJson } from "@/lib/api/client";
import { expenseCategoryLabel } from "@/lib/labels";
import type { ExpenseCategory, ExpenseRequest } from "@/lib/types";

const categories = Object.keys(expenseCategoryLabel) as ExpenseCategory[];

export function ExpenseForm({ expense }: { expense?: ExpenseRequest }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const body = {
      category: String(form.get("category")),
      amount: Number(form.get("amount")),
      reason: String(form.get("reason") ?? ""),
    };
    try {
      if (expense) {
        await clientJson(`/api/expenses/${expense.id}`, { method: "PUT", body: JSON.stringify(body) });
        router.refresh();
      } else {
        const created = await clientJson<ExpenseRequest>("/api/expenses", {
          method: "POST",
          body: JSON.stringify(body),
        });
        router.push(`/expenses/${created.id}`);
        router.refresh();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-medium">类别</span>
          <select
            name="category"
            defaultValue={expense?.category ?? "TRAVEL"}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {expenseCategoryLabel[category]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">金额</span>
          <input
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            required
            defaultValue={expense?.amount ?? ""}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">事由</span>
        <textarea
          name="reason"
          required
          defaultValue={expense?.reason ?? ""}
          className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
      >
        {expense ? "保存修改" : "保存草稿"}
      </button>
    </form>
  );
}
