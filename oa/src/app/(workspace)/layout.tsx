import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "./actions";
import { apiFetch } from "@/lib/api/server";
import type { CurrentUser } from "@/lib/types";

export const dynamic = "force-dynamic";

const links = [
  ["/todos", "待办"],
  ["/cc", "抄送我的"],
  ["/leaves", "请假"],
  ["/expenses", "报销"],
  ["/notices", "通知"],
];

const adminLinks = [
  ["/admin/departments", "部门"],
  ["/admin/users", "用户"],
  ["/admin/routes", "审批规则"],
];

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  let response: Response;
  try {
    response = await apiFetch("/api/auth/me");
  } catch {
    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <h1 className="text-xl font-semibold">连不上后端</h1>
        <p className="mt-2 text-sm text-slate-600">
          先在 application.yml 填好测试库地址，再启动 8090 端口的 Java 服务。
        </p>
      </main>
    );
  }
  if (response.status === 401) redirect("/login");
  if (!response.ok) throw new Error("无法读取当前用户");
  const user = (await response.json()) as CurrentUser;
  const unreadResponse = await apiFetch("/api/notices/unread-count");
  const unread = unreadResponse.ok
    ? ((await unreadResponse.json()) as { count: number }).count
    : 0;

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-5 py-3">
          <Link href="/todos" className="font-semibold">
            企业 OA
          </Link>
          <nav className="flex flex-wrap gap-1 text-sm">
            {links.map(([href, label]) => (
              <Link key={href} href={href} className="rounded-md px-3 py-1.5 text-slate-700 hover:bg-slate-100">
                {label}
                {href === "/notices" && unread > 0 ? (
                  <span className="ml-1 rounded-full bg-rose-600 px-1.5 text-xs text-white">{unread}</span>
                ) : null}
              </Link>
            ))}
            {user.role === "ADMIN"
              ? adminLinks.map(([href, label]) => (
                  <Link key={href} href={href} className="rounded-md px-3 py-1.5 text-slate-700 hover:bg-slate-100">
                    {label}
                  </Link>
                ))
              : null}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-slate-500">
              {user.displayName}
              {user.departmentName ? ` · ${user.departmentName}` : ""}
            </span>
            <form action={logout}>
              <button className="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100">退出</button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-5 py-6">{children}</div>
    </div>
  );
}
