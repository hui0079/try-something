import Link from "next/link";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api/server";
import type { CcInboxItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CcPage() {
  const response = await apiFetch("/api/cc");
  if (response.status === 401) redirect("/login");
  if (!response.ok) throw new Error("无法加载抄送");
  const items = (await response.json()) as CcInboxItem[];

  return (
    <main>
      <h1 className="mb-4 text-2xl font-semibold">抄送我的</h1>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">没有抄送给你的单据。</p>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {items.map((item) => (
            <li key={`${item.bizType}-${item.bizId}`}>
              <Link
                href={item.bizType === "LEAVE" ? `/leaves/${item.bizId}` : `/expenses/${item.bizId}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
              >
                <span>
                  {item.title}
                  <span className="ml-2 text-sm text-slate-500">{item.summary}</span>
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${item.read ? "bg-slate-200 text-slate-600" : "bg-amber-100 text-amber-900"}`}>
                  {item.read ? "已读" : "未读"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
