"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { clientJson } from "@/lib/api/client";
import { leaveTypeLabel } from "@/lib/labels";
import type { LeaveRequest, LeaveType } from "@/lib/types";

const types = Object.keys(leaveTypeLabel) as LeaveType[];

export function LeaveForm({ leave }: { leave?: LeaveRequest }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const body = {
      leaveType: String(form.get("leaveType")),
      startDate: String(form.get("startDate")),
      endDate: String(form.get("endDate")),
      days: Number(form.get("days")),
      reason: String(form.get("reason") ?? ""),
    };
    try {
      if (leave) {
        await clientJson(`/api/leaves/${leave.id}`, { method: "PUT", body: JSON.stringify(body) });
        router.refresh();
      } else {
        const created = await clientJson<LeaveRequest>("/api/leaves", {
          method: "POST",
          body: JSON.stringify(body),
        });
        router.push(`/leaves/${created.id}`);
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
          <span className="mb-1 block font-medium">类型</span>
          <select
            name="leaveType"
            defaultValue={leave?.leaveType ?? "ANNUAL"}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            {types.map((type) => (
              <option key={type} value={type}>
                {leaveTypeLabel[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">天数</span>
          <input
            name="days"
            type="number"
            min="0.1"
            step="0.1"
            required
            defaultValue={leave?.days ?? 1}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">开始日期</span>
          <input
            name="startDate"
            type="date"
            required
            defaultValue={leave?.startDate ?? ""}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">结束日期</span>
          <input
            name="endDate"
            type="date"
            required
            defaultValue={leave?.endDate ?? ""}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">事由</span>
        <textarea
          name="reason"
          required
          defaultValue={leave?.reason ?? ""}
          className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
      >
        {leave ? "保存修改" : "保存草稿"}
      </button>
    </form>
  );
}
