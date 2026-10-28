import Link from "next/link";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api/server";
import { noticeKindLabel } from "@/lib/labels";
import type { Notice } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NoticesPage() {
  const response = await apiFetch("/api/notices");
  if (response.status === 401) redirect("/login");
  if (!response.ok) throw new Error("无法加载通知");
  const notices = (await response.json()) as Notice[];

  return (
    <main>
      <h1 className="mb-4 text-2xl font-semibold">通知</h1>
      {notices.length === 0 ? (
        <p className="text-sm text-slate-500">还没有通知。</p>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {notices.map((notice) => (
            <li key={notice.id}>
              <Link
                href={notice.bizType === "LEAVE" ? `/leaves/${notice.bizId}` : `/expenses/${notice.bizId}`}
                className="block px-4 py-3 hover:bg-slate-50"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className={notice.read ? "text-slate-600" : "font-medium"}>
                    <span className="mr-2 text-xs text-slate-500">{noticeKindLabel[notice.kind]}</span>
                    {notice.title}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(notice.createdAt).toLocaleString("zh-CN", { hour12: false })}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{notice.body}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
