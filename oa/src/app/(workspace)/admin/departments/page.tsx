import { redirect } from "next/navigation";
import { DepartmentAdmin } from "@/features/admin/department-admin";
import { apiFetch } from "@/lib/api/server";
import type { Department, OrgUser } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DepartmentsPage() {
  const [departmentResponse, userResponse] = await Promise.all([
    apiFetch("/api/departments"),
    apiFetch("/api/users"),
  ]);
  if (departmentResponse.status === 401 || userResponse.status === 401) redirect("/login");
  if (departmentResponse.status === 403 || userResponse.status === 403) redirect("/todos");
  if (!departmentResponse.ok || !userResponse.ok) throw new Error("无法加载部门");
  const departments = (await departmentResponse.json()) as Department[];
  const users = (await userResponse.json()) as OrgUser[];

  return (
    <main>
      <h1 className="mb-4 text-2xl font-semibold">部门</h1>
      <DepartmentAdmin departments={departments} users={users} />
    </main>
  );
}
