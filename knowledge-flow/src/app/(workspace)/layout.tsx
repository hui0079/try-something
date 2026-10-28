import Link from "next/link";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api/server";
import type { CurrentUser } from "@/lib/api/types";
import { logout } from "./actions";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const response = await apiFetch("/api/auth/me");
  if (response.status === 401) redirect("/login");
  if (!response.ok) throw new Error("无法连接本地 Java 服务");
  const user = (await response.json()) as CurrentUser;

  return (
    <div className="starfield min-h-screen">
      <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Link href="/graphs" className="flex items-center gap-3 font-bold text-white">
            <span className="grid size-9 place-items-center rounded-xl bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.7)]">
              链
            </span>
            知识星图
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-400 sm:block">
              {user?.email}
            </span>
            <form action={logout}>
              <button className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white">
                退出
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
