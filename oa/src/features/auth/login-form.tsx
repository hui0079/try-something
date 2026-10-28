"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { clientJson } from "@/lib/api/client";

const accounts = [
  ["alice", "王小明 / 员工"],
  ["bob", "赵小红 / 王小明的主管"],
  ["lead", "李负责人 / 研发负责人"],
  ["finance", "陈财务"],
  ["gm", "周总"],
  ["admin", "管理员"],
];

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await clientJson("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username: String(form.get("username") ?? ""),
          password: String(form.get("password") ?? ""),
        }),
      });
      router.replace("/todos");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "登录失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <label className="block text-sm">
        <span className="mb-1 block font-medium">用户名</span>
        <input name="username" required className="w-full rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">密码</span>
        <input name="password" type="password" required className="w-full rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "登录中" : "登录"}
      </button>
      <div className="border-t border-slate-100 pt-3 text-xs leading-6 text-slate-500">
        <p className="font-medium text-slate-600">演示账号，密码都是用户名加 123</p>
        {accounts.map(([username, label]) => (
          <p key={username}>
            {username} / {username}123 · {label}
          </p>
        ))}
      </div>
    </form>
  );
}
