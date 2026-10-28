"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clientJson } from "@/lib/api/client";
import type { DirectoryUser } from "@/lib/types";

export function DecisionForm({
  taskId,
  people,
}: {
  taskId: string;
  people: DirectoryUser[];
}) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function decide(action: "approve" | "reject") {
    setPending(true);
    setError("");
    try {
      await clientJson(`/api/tasks/${taskId}/${action}`, {
        method: "POST",
        body: JSON.stringify({ comment }),
      });
      setComment("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "处理失败");
    } finally {
      setPending(false);
    }
  }

  async function transfer() {
    if (!targetUserId) {
      setError("请选择转交对象");
      return;
    }
    setPending(true);
    setError("");
    try {
      await clientJson(`/api/tasks/${taskId}/transfer`, {
        method: "POST",
        body: JSON.stringify({ targetUserId: Number(targetUserId), comment }),
      });
      setComment("");
      setTargetUserId("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "转交失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="意见，选填"
          className="min-w-40 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => decide("approve")}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-60"
        >
          通过
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => decide("reject")}
          className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm text-rose-700 disabled:opacity-60"
        >
          驳回
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={targetUserId}
          onChange={(event) => setTargetUserId(event.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">转交给…</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.displayName}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={pending}
          onClick={transfer}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-60"
        >
          转交
        </button>
        {error ? <span className="text-sm text-rose-600">{error}</span> : null}
      </div>
    </div>
  );
}
