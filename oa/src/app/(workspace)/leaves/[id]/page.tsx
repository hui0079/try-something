import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AttachmentPanel } from "@/features/documents/attachment-panel";
import { CcList } from "@/features/documents/cc-list";
import { DocumentActions } from "@/features/documents/document-actions";
import { ProcessChainView } from "@/features/documents/process-chain";
import { Timeline } from "@/features/documents/timeline";
import { LeaveForm } from "@/features/leaves/leave-form";
import { apiFetch } from "@/lib/api/server";
import { documentStatusLabel, leaveTypeLabel, statusClass } from "@/lib/labels";
import type { Attachment, CcPerson, CurrentUser, DirectoryUser, LeaveRequest, ProcessChain, TimelineEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LeaveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [detailResponse, meResponse, directoryResponse] = await Promise.all([
    apiFetch(`/api/leaves/${id}`),
    apiFetch("/api/auth/me"),
    apiFetch("/api/directory"),
  ]);
  if (detailResponse.status === 401 || meResponse.status === 401) redirect("/login");
  if (detailResponse.status === 404) notFound();
  if (!detailResponse.ok || !meResponse.ok || !directoryResponse.ok) throw new Error("无法加载请假单");

  const detail = (await detailResponse.json()) as {
    leave: LeaveRequest;
    history: TimelineEntry[];
    attachments: Attachment[];
    cc: CcPerson[];
    chains: ProcessChain[];
  };
  const me = (await meResponse.json()) as CurrentUser;
  const directory = (await directoryResponse.json()) as DirectoryUser[];
  const leave = detail.leave;
  const editable =
    me.id === leave.applicantId &&
    (leave.status === "DRAFT" || leave.status === "REJECTED" || leave.status === "CANCELLED");

  return (
    <main className="space-y-5">
      <div>
        <Link href="/leaves" className="text-sm text-slate-500 hover:underline">
          返回请假
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">
            {leave.applicantName}的{leaveTypeLabel[leave.leaveType]}
          </h1>
          <span className={`rounded-full px-2 py-0.5 text-xs ${statusClass(leave.status)}`}>
            {documentStatusLabel[leave.status]}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          {leave.startDate} 至 {leave.endDate} · {leave.days} 天
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm">{leave.reason}</p>
      </div>
      {me.id === leave.applicantId ? (
        <DocumentActions
          kind="leaves"
          id={leave.id}
          status={leave.status}
          people={directory.filter((person) => person.id !== me.id)}
        />
      ) : null}
      <CcList people={detail.cc} />
      <AttachmentPanel kind="leaves" id={leave.id} editable={editable} attachments={detail.attachments} />
      {editable ? <LeaveForm leave={leave} /> : null}
      {detail.chains.length > 0 ? (
        <ProcessChainView
          chains={detail.chains}
          currentUserId={me.id}
          people={directory.filter((person) => person.id !== me.id)}
          applicantName={leave.applicantName}
        />
      ) : null}
      {detail.history.length > 0 ? (
        <Timeline
          history={detail.history}
          currentUserId={me.id}
          people={directory}
          applicantName={leave.applicantName}
        />
      ) : null}
      {detail.chains.length === 0 && detail.history.length === 0 ? (
        <p className="text-sm text-slate-500">还没有提交过。</p>
      ) : null}
    </main>
  );
}
