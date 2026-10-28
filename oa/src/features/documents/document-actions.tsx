"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clientJson } from "@/lib/api/client";
import type { DirectoryUser } from "@/lib/types";

export function DocumentActions({
  kind,
  id,
  status,
  people,
}: {
  kind: "leaves" | "expenses";
  id: number;
  status: string;
  people: DirectoryUser[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [ccUserIds, setCcUserIds] = useState<number[]>([]);
  const editable = status === "DRAFT" || status === "REJECTED" || status === "CANCELLED";

  async function run(action: "submit" | "cancel" | "urge") {
    setPending(true);
    setError("");
    try {
      await clientJson(`/api/${kind}/${id}/${action}`, {
        method: "POST",
        body: action === "submit" ? JSON.stringify({ ccUserIds }) : undefined,
      });
      setCcUserIds([]);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "操作失败");
    } finally {
      setPending(false);
    }
  }

  function toggleCc(userId: number) {
    setCcUserIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  }

  if (!editable && status !== "IN_REVIEW") return null;

  return (
    <div className="space-y-3">
      {editable && people.length > 0 ? (
        <fieldset className="rounded-xl border border-slate-200 bg-white p-4">
          <legend className="px-1 text-sm font-medium">抄送</legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {people.map((person) => (
              <label key={person.id} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={ccUserIds.includes(person.id)}
                  onChange={() => toggleCc(person.id)}
                />
                {person.displayName}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {editable ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run("submit")}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-60"
          >
            提交
          </button>
        ) : null}
        {status === "IN_REVIEW" ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => run("urge")}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-60"
            >
              催办
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run("cancel")}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-60"
            >
              撤回
            </button>
          </>
        ) : null}
        {error ? <span className="text-sm text-rose-600">{error}</span> : null}
      </div>
    </div>
  );
}
