"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clientJson, clientUpload } from "@/lib/api/client";
import { apiBaseUrl } from "@/lib/api/config";
import type { Attachment } from "@/lib/types";

const limit = 10 * 1024 * 1024;

export function AttachmentPanel({
  kind,
  id,
  editable,
  attachments,
}: {
  kind: "leaves" | "expenses";
  id: number;
  editable: boolean;
  attachments: Attachment[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > limit) {
      setError("单个文件不能超过 10MB");
      return;
    }
    setPending(true);
    setError("");
    try {
      await clientUpload(`/api/${kind}/${id}/attachments`, file);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "上传失败");
    } finally {
      setPending(false);
    }
  }

  async function remove(attachmentId: number) {
    setPending(true);
    setError("");
    try {
      await clientJson(`/api/attachments/${attachmentId}`, { method: "DELETE" });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "删除失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-medium">附件</h2>
      {attachments.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">还没有附件。</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="flex items-center justify-between gap-3 text-sm">
              <a
                href={`${apiBaseUrl}/api/attachments/${attachment.id}`}
                className="hover:underline"
              >
                {attachment.name}
                <span className="ml-2 text-slate-500">{formatSize(attachment.sizeBytes)}</span>
              </a>
              {editable ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => remove(attachment.id)}
                  className="text-rose-700 disabled:opacity-60"
                >
                  删除
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {editable ? (
        <label className="mt-3 inline-block text-sm">
          <span className="rounded-lg border border-slate-300 px-3 py-1.5">
            {pending ? "处理中" : "上传"}
          </span>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
            disabled={pending}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              void upload(file);
            }}
          />
        </label>
      ) : null}
      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
    </section>
  );
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
