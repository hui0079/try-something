import { ApprovalTrack, type TrackNode, type TrackPerson, type TrackRound, type TrackTone } from "@/features/documents/approval-track";
import { stepLabel } from "@/lib/labels";
import type { DirectoryUser, TaskStatus, TimelineEntry } from "@/lib/types";

export function Timeline({
  history,
  currentUserId,
  people,
  applicantName,
}: {
  history: TimelineEntry[];
  currentUserId: number;
  people: DirectoryUser[];
  applicantName?: string;
}) {
  if (history.length === 0) return null;

  const rounds: TrackRound[] = history.map((entry, index) => ({
    id: entry.instanceId,
    index,
    status: entry.status,
    applicantName,
    nodes: nodesOf(entry),
  }));

  return <ApprovalTrack rounds={rounds} currentUserId={currentUserId} people={people} />;
}

function nodesOf(entry: TimelineEntry): TrackNode[] {
  const groups = new Map<number, TimelineEntry["tasks"]>();
  for (const task of entry.tasks) {
    const current = groups.get(task.stepIndex) ?? [];
    current.push(task);
    groups.set(task.stepIndex, current);
  }
  return [...groups.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([, tasks]) => ({
      key: `${entry.instanceId}-${tasks[0].stepIndex}`,
      name: stepLabel[tasks[0].stepCode],
      tone: toneOf(tasks.map((task) => task.status), entry.status),
      people: tasks.map(
        (task): TrackPerson => ({
          key: String(task.id),
          assigneeId: task.assigneeId,
          name: task.assigneeName,
          status: task.status,
          comment: task.comment,
          taskId: task.status === "PENDING" ? String(task.id) : null,
        }),
      ),
    }));
}

function toneOf(statuses: TaskStatus[], instanceStatus: TimelineEntry["status"]): TrackTone {
  if (statuses.includes("REJECTED")) return "rejected";
  if (statuses.includes("PENDING")) return "current";
  if (statuses.includes("APPROVED")) return "approved";
  if (instanceStatus === "CANCELLED") return "cancelled";
  return "upcoming";
}
