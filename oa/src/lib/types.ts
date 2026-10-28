export type Role = "EMPLOYEE" | "FINANCE" | "GM" | "ADMIN";
export type DocumentStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "CANCELLED";
export type InstanceStatus = "RUNNING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type TaskStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "TRANSFERRED";
export type NoticeKind = "URGE" | "CC" | "TASK" | "RESULT";
export type StepCode = "DIRECT_MANAGER" | "DEPT_HEAD" | "FINANCE" | "GM";
export type BizType = "LEAVE" | "EXPENSE";
export type LeaveType = "ANNUAL" | "SICK" | "PERSONAL";
export type ExpenseCategory = "TRAVEL" | "OFFICE" | "ENTERTAINMENT" | "OTHER";

export type CurrentUser = {
  id: number;
  username: string;
  displayName: string;
  role: Role;
  departmentName: string | null;
};

export type ChainState = "DONE" | "CURRENT" | "UPCOMING";

export type ChainPerson = {
  taskId: string | null;
  assigneeId: number;
  name: string;
  status: TaskStatus | null;
  comment: string | null;
};

export type ChainNode = {
  stepCode: StepCode;
  name: string;
  state: ChainState;
  people: ChainPerson[];
};

export type ProcessChain = {
  instanceId: number;
  status: InstanceStatus;
  nodes: ChainNode[];
};

export type DiagramView = {
  xml: string;
  completedActivityIds: string[];
  currentActivityIds: string[];
};

export type TodoItem = {
  id: string;
  bizType: BizType;
  bizId: number;
  applicantName: string;
  title: string;
  summary: string;
  stepCode: StepCode;
};

export type TaskView = {
  id: number;
  stepIndex: number;
  stepCode: StepCode;
  assigneeId: number;
  assigneeName: string;
  status: TaskStatus;
  comment: string | null;
  actedAt: string | null;
};

export type TimelineEntry = {
  instanceId: number;
  status: InstanceStatus;
  tasks: TaskView[];
};

export type LeaveRequest = {
  id: number;
  applicantId: number;
  applicantName: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: DocumentStatus;
};

export type ExpenseRequest = {
  id: number;
  applicantId: number;
  applicantName: string;
  category: ExpenseCategory;
  amount: number;
  reason: string;
  status: DocumentStatus;
};

export type Department = {
  id: number;
  name: string;
  parentId: number | null;
  parentName: string | null;
  leaderId: number | null;
  leaderName: string | null;
};

export type OrgUser = {
  id: number;
  username: string;
  displayName: string;
  departmentId: number | null;
  departmentName: string | null;
  managerId: number | null;
  managerName: string | null;
  role: Role;
};

export type Attachment = {
  id: number;
  name: string;
  sizeBytes: number;
};

export type CcPerson = {
  userId: number;
  displayName: string;
  read: boolean;
};

export type DirectoryUser = {
  id: number;
  displayName: string;
};

export type Notice = {
  id: number;
  bizType: BizType;
  bizId: number;
  kind: NoticeKind;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

export type CcInboxItem = {
  bizType: BizType;
  bizId: number;
  title: string;
  summary: string;
  read: boolean;
};

export type ApprovalRoute = {
  id: number;
  bizType: BizType;
  priority: number;
  minValue: number | null;
  maxValue: number | null;
  steps: StepCode[];
  enabled: boolean;
};
