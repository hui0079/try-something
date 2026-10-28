"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiBaseUrl } from "@/lib/api/config";

export function DeleteGraphButton({
  graphId,
  redirectAfterDelete = false,
}: {
  graphId: string;
  redirectAfterDelete?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (!window.confirm("确定删除这张图谱吗？此操作无法撤销。")) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/graphs/${graphId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const body = await response.json();
        setError(body.error?.message ?? "删除失败");
        return;
      }
      if (redirectAfterDelete) router.push("/graphs");
      router.refresh();
    } catch {
      setError("网络连接失败，请重试。");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="rounded-lg px-3 py-2 text-sm font-medium text-rose-300 hover:bg-rose-500/10 disabled:opacity-60"
      >
        {pending ? "删除中…" : "删除"}
      </button>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
