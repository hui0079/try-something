import { ApprovalTrack, type TrackPerson, type TrackRound, type TrackTone } from "@/features/documents/approval-track";
import type { ChainNode, DirectoryUser, ProcessChain } from "@/lib/types";

export function ProcessChainView({
  chains,
  currentUserId,
  people,
  applicantName,
}: {
  chains: ProcessChain[];
  currentUserId: number;
  people: DirectoryUser[];
  applicantName?: string;
}) {
  if (chains.length === 0) return null;

  const rounds: TrackRound[] = chains.map((chain, index) => ({
    id: chain.instanceId,
    index,
    status: chain.status,
    applicantName,
    diagramInstanceId: chain.instanceId,
    nodes: chain.nodes.map((node) => ({
      key: `${chain.instanceId}-${node.stepCode}`,
      name: node.name,
      tone: toneOf(node),
      people: node.people.map(
        (person): TrackPerson => ({
          key: `${person.assigneeId}-${person.taskId ?? "plan"}`,
          assigneeId: person.assigneeId,
          name: person.name,
          status: person.status,
          comment: person.comment,
          taskId: person.taskId,
        }),
      ),
    })),
  }));

  return <ApprovalTrack rounds={rounds} currentUserId={currentUserId} people={people} />;
}

function toneOf(node: ChainNode): TrackTone {
  if (node.people.some((person) => person.status === "REJECTED")) return "rejected";
  if (node.state === "CURRENT" || node.people.some((person) => person.status === "PENDING")) return "current";
  if (node.people.some((person) => person.status === "APPROVED") || node.state === "DONE") return "approved";
  if (node.people.some((person) => person.status === "CANCELLED")) return "cancelled";
  return "upcoming";
}
