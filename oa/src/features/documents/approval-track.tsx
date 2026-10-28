"use client";

import { useEffect, useRef, useState } from "react";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css";
import "./process-diagram.css";
import { DecisionForm } from "@/features/tasks/decision-form";
import { clientJson } from "@/lib/api/client";
import { instanceStatusLabel } from "@/lib/labels";
import type { DiagramView, DirectoryUser, InstanceStatus, TaskStatus } from "@/lib/types";

export type TrackTone = "approved" | "rejected" | "current" | "upcoming" | "cancelled";

export type TrackPerson = {
  key: string;
  assigneeId: number;
  name: string;
  status: TaskStatus | null;
  comment: string | null;
  taskId: string | null;
};

export type TrackNode = {
  key: string;
  name: string;
  tone: TrackTone;
  caption?: string;
  people: TrackPerson[];
};

export type TrackRound = {
  id: number;
  index: number;
  status: InstanceStatus;
  nodes: TrackNode[];
  applicantName?: string;
  diagramInstanceId?: number;
};

const toneLabel: Record<TrackTone, string> = {
  approved: "已通过",
  rejected: "已驳回",
  current: "审批中",
  upcoming: "未到",
  cancelled: "已撤回",
};

const circleClass: Record<TrackTone, string> = {
  approved: "bg-emerald-600 text-white",
  rejected: "bg-rose-600 text-white",
  current: "bg-amber-500 text-white ring-4 ring-amber-100",
  upcoming: "bg-slate-200 text-slate-500",
  cancelled: "bg-slate-400 text-white",
};

const lineClass: Record<TrackTone, string> = {
  approved: "bg-emerald-300",
  rejected: "bg-rose-300",
  current: "bg-amber-300",
  upcoming: "bg-slate-200",
  cancelled: "bg-slate-300",
};

const cardClass: Record<TrackTone, string> = {
  approved: "border-emerald-200 bg-emerald-50",
  rejected: "border-rose-200 bg-rose-50",
  current: "border-amber-300 bg-amber-50",
  upcoming: "border-dashed border-slate-200 bg-slate-50",
  cancelled: "border-slate-200 bg-slate-50",
};

export function ApprovalTrack({
  rounds,
  currentUserId,
  people,
}: {
  rounds: TrackRound[];
  currentUserId: number;
  people: DirectoryUser[];
}) {
  if (rounds.length === 0) return null;

  return (
    <div className="space-y-4">
      {rounds.map((round) => (
        <RoundCard key={round.id} round={round} currentUserId={currentUserId} people={people} />
      ))}
    </div>
  );
}

function RoundCard({
  round,
  currentUserId,
  people,
}: {
  round: TrackRound;
  currentUserId: number;
  people: DirectoryUser[];
}) {
  const nodes = withEnds(round);
  const [diagramOpen, setDiagramOpen] = useState(false);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold">审批链</h2>
          <p className="mt-1 text-sm text-slate-500">第 {round.index + 1} 次审批</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs ${badgeClass(round.status)}`}>
            {instanceStatusLabel[round.status]}
          </span>
          {round.diagramInstanceId ? (
            <button
              type="button"
              onClick={() => setDiagramOpen((open) => !open)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            >
              {diagramOpen ? "收起流程图" : "查看流程图"}
            </button>
          ) : null}
        </div>
      </div>
      {round.nodes.length === 0 ? (
        <p className="px-5 py-6 text-sm text-slate-500">没有审批人，提交后直接结束。</p>
      ) : (
        <div className="overflow-x-auto px-5 py-6">
          <ol className="flex min-w-max items-start">
            {nodes.map((node, index) => (
              <li key={node.key} className="w-60">
                <div className="flex items-center">
                  <span
                    className={`z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${circleClass[node.tone]}`}
                  >
                    {index + 1}
                  </span>
                  {index < nodes.length - 1 ? (
                    <span className={`h-0.5 flex-1 ${lineClass[node.tone]}`} />
                  ) : (
                    <span className="flex-1" />
                  )}
                </div>
                <div className={`mr-6 mt-4 rounded-xl border p-3 ${cardClass[node.tone]}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{node.name}</p>
                    <span className="text-xs text-slate-500">{node.caption ?? toneLabel[node.tone]}</span>
                  </div>
                  {node.people.length > 0 ? (
                    <ul className="mt-3 space-y-2">
                      {node.people.map((person) => (
                        <li key={person.key} className="rounded-lg bg-white px-2.5 py-2 text-sm shadow-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{person.name}</span>
                            {person.status ? (
                              <span className="text-xs text-slate-500">{toneLabel[toneFromStatus(person.status)]}</span>
                            ) : null}
                          </div>
                          {person.comment ? (
                            <p className="mt-1 border-l-2 border-slate-200 pl-2 text-slate-600">{person.comment}</p>
                          ) : null}
                          {person.taskId && person.status === "PENDING" && person.assigneeId === currentUserId ? (
                            <div className="mt-2">
                              <DecisionForm taskId={person.taskId} people={people} />
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
      {diagramOpen && round.diagramInstanceId ? <ProcessDiagram instanceId={round.diagramInstanceId} /> : null}
    </section>
  );
}

function withEnds(round: TrackRound): TrackNode[] {
  const nodes = [...round.nodes];
  if (round.applicantName) {
    nodes.unshift({
      key: `${round.id}-start`,
      name: "发起",
      tone: "approved",
      caption: "已提交",
      people: [
        {
          key: `${round.id}-applicant`,
          assigneeId: 0,
          name: round.applicantName,
          status: null,
          comment: null,
          taskId: null,
        },
      ],
    });
  }
  if (round.status !== "RUNNING" && round.nodes.length > 0) {
    nodes.push({
      key: `${round.id}-end`,
      name: "结束",
      tone: endTone(round.status),
      people: [],
    });
  }
  return nodes;
}

function endTone(status: InstanceStatus): TrackTone {
  if (status === "APPROVED") return "approved";
  if (status === "REJECTED") return "rejected";
  return "cancelled";
}

function toneFromStatus(status: TaskStatus): TrackTone {
  if (status === "APPROVED") return "approved";
  if (status === "REJECTED") return "rejected";
  if (status === "PENDING") return "current";
  if (status === "TRANSFERRED") return "cancelled";
  return "cancelled";
}

function badgeClass(status: InstanceStatus) {
  if (status === "APPROVED") return "bg-emerald-100 text-emerald-800";
  if (status === "REJECTED") return "bg-rose-100 text-rose-800";
  if (status === "RUNNING") return "bg-amber-100 text-amber-900";
  return "bg-slate-200 text-slate-600";
}

function ProcessDiagram({ instanceId }: { instanceId: number }) {
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!host.current) return;
    const container = host.current;
    let viewer: { destroy: () => void } | null = null;
    let cancelled = false;
    (async () => {
      try {
        const [{ default: NavigatedViewer }, diagram] = await Promise.all([
          import("bpmn-js/lib/NavigatedViewer"),
          clientJson<DiagramView>(`/api/processes/${instanceId}/diagram`),
        ]);
        if (cancelled) return;
        const created = new NavigatedViewer({ container }) as BpmnViewer;
        viewer = created;
        await created.importXML(diagram.xml);
        const canvas = created.get("canvas");
        for (const id of diagram.completedActivityIds) canvas.addMarker(id, "oa-completed");
        for (const id of diagram.currentActivityIds) canvas.addMarker(id, "oa-current");
        canvas.zoom("fit-viewport");
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "流程图加载失败");
      }
    })();
    return () => {
      cancelled = true;
      viewer?.destroy();
    };
  }, [instanceId]);

  return (
    <div className="border-t border-slate-100 px-5 py-4">
      <div ref={host} className="oa-diagram h-80 overflow-hidden rounded-lg border border-slate-200 bg-slate-50" />
      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}

type BpmnViewer = {
  importXML: (xml: string) => Promise<unknown>;
  get: (name: "canvas") => {
    addMarker: (id: string, marker: string) => void;
    zoom: (value: "fit-viewport") => void;
  };
  destroy: () => void;
};
