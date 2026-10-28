import type {
  DocumentStatus,
  ExpenseCategory,
  InstanceStatus,
  LeaveType,
  NoticeKind,
  Role,
  StepCode,
  TaskStatus,
} from "./types";

export const roleLabel: Record<Role, string> = {
  EMPLOYEE: "员工",
  FINANCE: "财务",
  GM: "总经理",
  ADMIN: "管理员",
};

export const leaveTypeLabel: Record<LeaveType, string> = {
  ANNUAL: "年假",
  SICK: "病假",
  PERSONAL: "事假",
};

export const expenseCategoryLabel: Record<ExpenseCategory, string> = {
  TRAVEL: "差旅",
  OFFICE: "办公",
  ENTERTAINMENT: "招待",
  OTHER: "其他",
};

export const stepLabel: Record<StepCode, string> = {
  DIRECT_MANAGER: "直属主管",
  DEPT_HEAD: "部门负责人",
  FINANCE: "财务",
  GM: "总经理",
};

export const documentStatusLabel: Record<DocumentStatus, string> = {
  DRAFT: "草稿",
  IN_REVIEW: "审批中",
  APPROVED: "已通过",
  REJECTED: "已驳回",
  CANCELLED: "已撤回",
};

export const instanceStatusLabel: Record<InstanceStatus, string> = {
  RUNNING: "审批中",
  APPROVED: "已通过",
  REJECTED: "已驳回",
  CANCELLED: "已撤回",
};

export const taskStatusLabel: Record<TaskStatus, string> = {
  PENDING: "待处理",
  APPROVED: "已通过",
  REJECTED: "已驳回",
  CANCELLED: "已取消",
  TRANSFERRED: "已转交",
};

export const noticeKindLabel: Record<NoticeKind, string> = {
  URGE: "催办",
  CC: "抄送",
  TASK: "待办",
  RESULT: "结果",
};

export function statusClass(status: string) {
  if (status === "APPROVED") return "bg-emerald-100 text-emerald-800";
  if (status === "REJECTED") return "bg-rose-100 text-rose-800";
  if (status === "IN_REVIEW" || status === "RUNNING" || status === "PENDING") {
    return "bg-amber-100 text-amber-900";
  }
  return "bg-slate-200 text-slate-600";
}
