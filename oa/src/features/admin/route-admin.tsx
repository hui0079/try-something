"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { clientJson } from "@/lib/api/client";
import { stepLabel } from "@/lib/labels";
import type { ApprovalRoute, BizType, StepCode } from "@/lib/types";

const stepOrder: StepCode[] = ["DIRECT_MANAGER", "DEPT_HEAD", "FINANCE", "GM"];

function selectedSteps(form: FormData) {
  return stepOrder.filter((step) => form.get(step) === "on");
}

function numberOrNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? Number(text) : null;
}

export function RouteAdmin({ routes }: { routes: ApprovalRoute[] }) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await clientJson("/api/approval-routes", {
        method: "POST",
        body: JSON.stringify({
          bizType: String(form.get("bizType")),
          priority: Number(form.get("priority")),
          minValue: numberOrNull(form.get("minValue")),
          maxValue: numberOrNull(form.get("maxValue")),
          steps: selectedSteps(form),
          enabled: form.get("enabled") === "on",
        }),
      });
      event.currentTarget.reset();
      setError("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存失败");
    }
  }

  async function save(route: ApprovalRoute, form: FormData) {
    await clientJson(`/api/approval-routes/${route.id}`, {
      method: "PUT",
      body: JSON.stringify({
        bizType: String(form.get("bizType")),
        priority: Number(form.get("priority")),
        minValue: numberOrNull(form.get("minValue")),
        maxValue: numberOrNull(form.get("maxValue")),
        steps: selectedSteps(form),
        enabled: form.get("enabled") === "on",
      }),
    });
    router.refresh();
  }

  async function remove(id: number) {
    if (!confirm("删除这条规则？")) return;
    try {
      await clientJson(`/api/approval-routes/${id}`, { method: "DELETE" });
      setError("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "删除失败");
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">下限不含本数，上限含本数。请假看天数，报销看金额。步骤按主管、部门负责人、财务、总经理的顺序执行。</p>
      <RouteFields onSubmit={create} submitLabel="添加规则" />
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <ul className="space-y-3">
        {routes.map((route) => (
          <li key={route.id}>
            <RouteFields
              route={route}
              submitLabel="保存"
              onSubmit={async (event) => {
                event.preventDefault();
                try {
                  await save(route, new FormData(event.currentTarget));
                  setError("");
                } catch (caught) {
                  setError(caught instanceof Error ? caught.message : "保存失败");
                }
              }}
              onDelete={() => remove(route.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function RouteFields({
  route,
  submitLabel,
  onSubmit,
  onDelete,
}: {
  route?: ApprovalRoute;
  submitLabel: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDelete?: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap gap-2">
        <select name="bizType" defaultValue={route?.bizType ?? "LEAVE"} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value={"LEAVE" satisfies BizType}>请假</option>
          <option value={"EXPENSE" satisfies BizType}>报销</option>
        </select>
        <input
          name="priority"
          type="number"
          required
          defaultValue={route?.priority ?? 10}
          className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          aria-label="优先级"
        />
        <input
          name="minValue"
          type="number"
          step="0.01"
          placeholder="下限"
          defaultValue={route?.minValue ?? ""}
          className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          name="maxValue"
          type="number"
          step="0.01"
          placeholder="上限"
          defaultValue={route?.maxValue ?? ""}
          className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-2 text-sm">
          <input name="enabled" type="checkbox" defaultChecked={route?.enabled ?? true} />
          启用
        </label>
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        {stepOrder.map((step) => (
          <label key={step} className="flex items-center gap-1">
            <input name={step} type="checkbox" defaultChecked={route ? route.steps.includes(step) : step === "DIRECT_MANAGER"} />
            {stepLabel[step]}
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">{submitLabel}</button>
        {onDelete ? (
          <button type="button" onClick={onDelete} className="rounded-lg px-3 py-2 text-sm text-rose-700">
            删除
          </button>
        ) : null}
      </div>
    </form>
  );
}
