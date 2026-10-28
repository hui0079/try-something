"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { clientJson } from "@/lib/api/client";
import { roleLabel } from "@/lib/labels";
import type { Department, OrgUser, Role } from "@/lib/types";

const roles = Object.keys(roleLabel) as Role[];

export function UserAdmin({ users, departments }: { users: OrgUser[]; departments: Department[] }) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const departmentId = String(form.get("departmentId") ?? "");
    const managerId = String(form.get("managerId") ?? "");
    try {
      await clientJson("/api/users", {
        method: "POST",
        body: JSON.stringify({
          username: String(form.get("username") ?? ""),
          password: String(form.get("password") ?? ""),
          displayName: String(form.get("displayName") ?? ""),
          departmentId: departmentId ? Number(departmentId) : null,
          managerId: managerId ? Number(managerId) : null,
          role: String(form.get("role")),
        }),
      });
      event.currentTarget.reset();
      setError("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存失败");
    }
  }

  async function save(user: OrgUser, form: FormData) {
    const departmentId = String(form.get("departmentId") ?? "");
    const managerId = String(form.get("managerId") ?? "");
    const password = String(form.get("password") ?? "");
    await clientJson(`/api/users/${user.id}`, {
      method: "PUT",
      body: JSON.stringify({
        displayName: String(form.get("displayName") ?? ""),
        password: password || null,
        departmentId: departmentId ? Number(departmentId) : null,
        managerId: managerId ? Number(managerId) : null,
        role: String(form.get("role")),
      }),
    });
    router.refresh();
  }

  async function remove(id: number) {
    if (!confirm("删除这个用户？")) return;
    try {
      await clientJson(`/api/users/${id}`, { method: "DELETE" });
      setError("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "删除失败");
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={create} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <input name="username" required placeholder="用户名" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input name="displayName" required placeholder="姓名" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input name="password" required placeholder="初始密码" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <select name="departmentId" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">无部门</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
        <select name="managerId" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">无主管</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.displayName}
            </option>
          ))}
        </select>
        <select name="role" defaultValue="EMPLOYEE" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          {roles.map((role) => (
            <option key={role} value={role}>
              {roleLabel[role]}
            </option>
          ))}
        </select>
        <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white sm:col-span-3">添加用户</button>
      </form>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <ul className="space-y-3">
        {users.map((user) => (
          <li
            key={`${user.id}-${user.displayName}-${user.role}-${user.departmentId ?? ""}-${user.managerId ?? ""}`}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <form
              className="grid gap-2 sm:grid-cols-3"
              onSubmit={async (event) => {
                event.preventDefault();
                try {
                  await save(user, new FormData(event.currentTarget));
                  setError("");
                } catch (caught) {
                  setError(caught instanceof Error ? caught.message : "保存失败");
                }
              }}
            >
              <p className="text-sm text-slate-500 sm:col-span-3">{user.username}</p>
              <input name="displayName" defaultValue={user.displayName} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input name="password" placeholder="留空则不改密码" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <select name="role" defaultValue={user.role} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {roleLabel[role]}
                  </option>
                ))}
              </select>
              <select name="departmentId" defaultValue={user.departmentId ?? ""} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="">无部门</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
              <select name="managerId" defaultValue={user.managerId ?? ""} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="">无主管</option>
                {users
                  .filter((item) => item.id !== user.id)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.displayName}
                    </option>
                  ))}
              </select>
              <div className="flex gap-2">
                <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">保存</button>
                <button type="button" onClick={() => remove(user.id)} className="rounded-lg px-3 py-2 text-sm text-rose-700">
                  删除
                </button>
              </div>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
