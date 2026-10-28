"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiBaseUrl } from "@/lib/api/config";
import type { ApiError } from "@/lib/api/types";

type AuthMode = "login" | "signup";

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("login");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/auth/${mode === "login" ? "login" : "register"}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password }),
        },
      );
      if (!response.ok) {
        const body = (await response.json()) as ApiError;
        setError(body.error?.message ?? "操作失败，请重试");
        return;
      }

      const next = searchParams.get("next");
      const destination =
        next?.startsWith("/") && !next.startsWith("//") ? next : "/graphs";
      router.replace(destination);
      router.refresh();
    } catch {
      setError("无法连接本地 Java 服务，请确认后端已在 8088 端口启动。");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950/80 p-8 shadow-[0_0_48px_rgba(99,102,241,0.2)] backdrop-blur-xl">
      <div className="mb-7 flex rounded-xl bg-white/5 p-1">
        {(["login", "signup"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setMode(item);
              setError("");
            }}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              mode === item
                ? "bg-indigo-500 text-white shadow-[0_0_16px_rgba(99,102,241,0.55)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {item === "login" ? "登录" : "注册"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">
            邮箱
          </span>
          <input
            required
            type="email"
            name="email"
            autoComplete="email"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20"
            placeholder="you@example.com"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">
            密码
          </span>
          <input
            required
            minLength={6}
            type="password"
            name="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20"
            placeholder="至少 6 位"
          />
        </label>

        {error && (
          <p role="alert" className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        )}
        <button
          disabled={pending}
          className="w-full rounded-xl bg-indigo-500 px-4 py-3 font-semibold text-white shadow-[0_0_20px_rgba(99,102,241,0.45)] transition hover:bg-indigo-400 disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "处理中…" : mode === "login" ? "登录" : "创建账户"}
        </button>
      </form>
    </div>
  );
}
