import { Suspense } from "react";
import { AuthForm } from "@/features/auth/auth-form";

export default function LoginPage() {
  return (
    <main className="starfield grid min-h-screen place-items-center px-6 py-16">
      <section className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-indigo-500 text-xl font-bold text-white shadow-[0_0_28px_rgba(99,102,241,0.75)]">
            链
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            知识星图
          </h1>
          <p className="mt-2 text-slate-400">
            把结构化知识点亮成一条会发光的路径
          </p>
        </div>
        <Suspense fallback={<div className="h-96 rounded-3xl bg-slate-950" />}>
          <AuthForm />
        </Suspense>
      </section>
    </main>
  );
}
