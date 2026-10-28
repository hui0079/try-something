import { redirect } from "next/navigation";
import { RouteAdmin } from "@/features/admin/route-admin";
import { apiFetch } from "@/lib/api/server";
import type { ApprovalRoute } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RoutesPage() {
  const response = await apiFetch("/api/approval-routes");
  if (response.status === 401) redirect("/login");
  if (response.status === 403) redirect("/todos");
  if (!response.ok) throw new Error("无法加载审批规则");
  const routes = (await response.json()) as ApprovalRoute[];

  return (
    <main>
      <h1 className="mb-4 text-2xl font-semibold">审批规则</h1>
      <RouteAdmin routes={routes} />
    </main>
  );
}
