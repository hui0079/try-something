import { LeaveForm } from "@/features/leaves/leave-form";

export default function NewLeavePage() {
  return (
    <main>
      <h1 className="mb-4 text-2xl font-semibold">新建请假</h1>
      <LeaveForm />
    </main>
  );
}
