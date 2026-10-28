import { ExpenseForm } from "@/features/expenses/expense-form";

export default function NewExpensePage() {
  return (
    <main>
      <h1 className="mb-4 text-2xl font-semibold">新建报销</h1>
      <ExpenseForm />
    </main>
  );
}
