import Link from "next/link";
import { apiFetch } from "@/lib/api/server";
import { documentStatusLabel, leaveTypeLabel, statusClass } from "@/lib/labels";
import type { LeaveRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LeavesPage() {
  const response = await apiFetch("/api/leaves/mine");
  if (!response.ok) throw new Error("无法加载请假单");
  const leaves = (await response.json()) as LeaveRequest[];

  return (
    <main>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">我的请假</h1>
        <Link href="/leaves/new" className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white">
          新建
        </Link>
      </div>
      {leaves.length === 0 ? (
        <p className="text-sm text-slate-500">还没有请假单。</p>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {leaves.map((leave) => (
            <li key={leave.id}>
              <Link href={`/leaves/${leave.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
                <span>
                  {leaveTypeLabel[leave.leaveType]} · {leave.days} 天
                  <span className="ml-2 text-sm text-slate-500">
                    {leave.startDate} 至 {leave.endDate}
                  </span>
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${statusClass(leave.status)}`}>
                  {documentStatusLabel[leave.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
