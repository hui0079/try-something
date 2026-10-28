import { LoginForm } from "@/features/auth/login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-16">
      <section className="w-full max-w-md">
        <h1 className="mb-2 text-3xl font-semibold">企业 OA</h1>
        <p className="mb-6 text-sm text-slate-500">请假和报销走同一套审批。</p>
        <LoginForm />
      </section>
    </main>
  );
}
