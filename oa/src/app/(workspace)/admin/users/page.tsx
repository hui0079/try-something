import { redirect } from "next/navigation";
import { UserAdmin } from "@/features/admin/user-admin";
import { apiFetch } from "@/lib/api/server";
import type { Department, OrgUser } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const [userResponse, departmentResponse] = await Promise.all([
    apiFetch("/api/users"),
    apiFetch("/api/departments"),
  ]);
  if (userResponse.status === 401 || departmentResponse.status === 401) redirect("/login");
  if (userResponse.status === 403 || departmentResponse.status === 403) redirect("/todos");
  if (!userResponse.ok || !departmentResponse.ok) throw new Error("无法加载用户");

  return (
    <main>
      <h1 className="mb-4 text-2xl font-semibold">用户</h1>
      <UserAdmin
        users={(await userResponse.json()) as OrgUser[]}
        departments={(await departmentResponse.json()) as Department[]}
      />
    </main>
  );
}
