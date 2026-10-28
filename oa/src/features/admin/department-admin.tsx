"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { clientJson } from "@/lib/api/client";
import type { Department, OrgUser } from "@/lib/types";

export function DepartmentAdmin({
  departments,
  users,
}: {
  departments: Department[];
  users: OrgUser[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parent = String(form.get("parentId") ?? "");
    try {
      await clientJson("/api/departments", {
        method: "POST",
        body: JSON.stringify({
          name: String(form.get("name") ?? ""),
          parentId: parent ? Number(parent) : null,
        }),
      });
      event.currentTarget.reset();
      setError("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存失败");
    }
  }

  async function save(department: Department, form: FormData) {
    const parent = String(form.get("parentId") ?? "");
    const leader = String(form.get("leaderId") ?? "");
    await clientJson(`/api/departments/${department.id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: String(form.get("name") ?? ""),
        parentId: parent ? Number(parent) : null,
        leaderId: leader ? Number(leader) : null,
      }),
    });
    router.refresh();
  }

  async function remove(id: number) {
    if (!confirm("删除这个部门？")) return;
    try {
      await clientJson(`/api/departments/${id}`, { method: "DELETE" });
      setError("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "删除失败");
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={create} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-4">
        <label className="text-sm">
          <span className="mb-1 block">新部门</span>
          <input name="name" required className="rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block">上级</span>
          <select name="parentId" className="rounded-lg border border-slate-300 px-3 py-2">
            <option value="">无</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </label>
        <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">添加</button>
      </form>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <ul className="space-y-3">
        {departments.map((department) => (
          <li
            key={`${department.id}-${department.name}-${department.parentId ?? ""}-${department.leaderId ?? ""}`}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={async (event) => {
                event.preventDefault();
                try {
                  await save(department, new FormData(event.currentTarget));
                  setError("");
                } catch (caught) {
                  setError(caught instanceof Error ? caught.message : "保存失败");
                }
              }}
            >
              <input name="name" defaultValue={department.name} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <select name="parentId" defaultValue={department.parentId ?? ""} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="">无上级</option>
                {departments
                  .filter((item) => item.id !== department.id)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
              <select name="leaderId" defaultValue={department.leaderId ?? ""} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="">无负责人</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.displayName}
                  </option>
                ))}
              </select>
              <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">保存</button>
              <button type="button" onClick={() => remove(department.id)} className="rounded-lg px-3 py-2 text-sm text-rose-700">
                删除
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
