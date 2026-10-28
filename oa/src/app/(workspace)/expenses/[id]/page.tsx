import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AttachmentPanel } from "@/features/documents/attachment-panel";
import { CcList } from "@/features/documents/cc-list";
import { DocumentActions } from "@/features/documents/document-actions";
import { ProcessChainView } from "@/features/documents/process-chain";
import { Timeline } from "@/features/documents/timeline";
import { ExpenseForm } from "@/features/expenses/expense-form";
import { apiFetch } from "@/lib/api/server";
import { documentStatusLabel, expenseCategoryLabel, statusClass } from "@/lib/labels";
import type { Attachment, CcPerson, CurrentUser, DirectoryUser, ExpenseRequest, ProcessChain, TimelineEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [detailResponse, meResponse, directoryResponse] = await Promise.all([
    apiFetch(`/api/expenses/${id}`),
    apiFetch("/api/auth/me"),
    apiFetch("/api/directory"),
  ]);
  if (detailResponse.status === 401 || meResponse.status === 401) redirect("/login");
  if (detailResponse.status === 404) notFound();
  if (!detailResponse.ok || !meResponse.ok || !directoryResponse.ok) throw new Error("无法加载报销单");

  const detail = (await detailResponse.json()) as {
    expense: ExpenseRequest;
    history: TimelineEntry[];
    attachments: Attachment[];
    cc: CcPerson[];
    chains: ProcessChain[];
  };
  const me = (await meResponse.json()) as CurrentUser;
  const directory = (await directoryResponse.json()) as DirectoryUser[];
  const expense = detail.expense;
  const editable =
    me.id === expense.applicantId &&
    (expense.status === "DRAFT" || expense.status === "REJECTED" || expense.status === "CANCELLED");

  return (
    <main className="space-y-5">
      <div>
        <Link href="/expenses" className="text-sm text-slate-500 hover:underline">
          返回报销
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">
            {expense.applicantName}的{expenseCategoryLabel[expense.category]}报销
          </h1>
          <span className={`rounded-full px-2 py-0.5 text-xs ${statusClass(expense.status)}`}>
            {documentStatusLabel[expense.status]}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-600">{expense.amount} 元</p>
        <p className="mt-2 whitespace-pre-wrap text-sm">{expense.reason}</p>
      </div>
      {me.id === expense.applicantId ? (
        <DocumentActions
          kind="expenses"
          id={expense.id}
          status={expense.status}
          people={directory.filter((person) => person.id !== me.id)}
        />
      ) : null}
      <CcList people={detail.cc} />
      <AttachmentPanel kind="expenses" id={expense.id} editable={editable} attachments={detail.attachments} />
      {editable ? <ExpenseForm expense={expense} /> : null}
      {detail.chains.length > 0 ? (
        <ProcessChainView
          chains={detail.chains}
          currentUserId={me.id}
          people={directory.filter((person) => person.id !== me.id)}
          applicantName={expense.applicantName}
        />
      ) : null}
      {detail.history.length > 0 ? (
        <Timeline
          history={detail.history}
          currentUserId={me.id}
          people={directory}
          applicantName={expense.applicantName}
        />
      ) : null}
      {detail.chains.length === 0 && detail.history.length === 0 ? (
        <p className="text-sm text-slate-500">还没有提交过。</p>
      ) : null}
    </main>
  );
}
