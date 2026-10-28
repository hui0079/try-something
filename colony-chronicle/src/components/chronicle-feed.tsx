"use client";

import type { ChronicleEntry, ChronicleLine } from "@/lib/chronicle/render";
import type { Severity } from "@/lib/sim/events";
import type { World } from "@/lib/sim/types";

import { Chip, Panel } from "./ui";

const LINE_TONE: Record<Severity, string> = {
  minor: "text-muted",
  notable: "text-foreground/90",
  major: "text-foreground",
};

function Line({ line, onVillager }: { line: ChronicleLine; onVillager: (id: string) => void }) {
  const major = line.severity === "major";
  return (
    <li className={`flex gap-2 text-[13px] leading-relaxed ${LINE_TONE[line.severity]}`}>
      <span
        aria-hidden
        className={`mt-[7px] h-1 w-1 shrink-0 rounded-full ${
          major ? "bg-danger" : line.severity === "notable" ? "bg-accent/70" : "bg-muted/40"
        }`}
      />
      {line.villagerId ? (
        <button
          type="button"
          onClick={() => onVillager(line.villagerId as string)}
          className={`text-left hover:text-accent hover:underline ${major ? "font-medium" : ""}`}
        >
          {line.text}
        </button>
      ) : (
        <span className={major ? "font-medium" : undefined}>{line.text}</span>
      )}
    </li>
  );
}

function Entry({ entry, onVillager }: { entry: ChronicleEntry; onVillager: (id: string) => void }) {
  return (
    <article className="border-b border-line/60 px-3 py-2.5 last:border-b-0">
      <h3 className="mb-1 font-mono text-[11px] tracking-wide text-accent/80">{entry.dateLabel}</h3>
      <ul className="space-y-1">
        {entry.lines.map((line) => (
          <Line key={line.id} line={line} onVillager={onVillager} />
        ))}
      </ul>
    </article>
  );
}

export function ChronicleFeed({
  world,
  entries,
  narrating,
  regionId,
  onRegionId,
  onVillager,
}: {
  world: World;
  entries: readonly ChronicleEntry[];
  narrating: boolean;
  regionId: string | null;
  onRegionId: (value: string | null) => void;
  onVillager: (id: string) => void;
}) {
  return (
    <Panel
      title="编年史"
      aside={<span className="text-[11px] text-muted">一年一篇</span>}
      className="min-h-0 flex-1"
    >
      <div className="thin-scroll flex shrink-0 gap-1 overflow-x-auto border-b border-line/60 px-3 py-2">
        <Chip active={regionId === null} onClick={() => onRegionId(null)}>
          全境
        </Chip>
        {world.regions.map((region) => (
          <Chip
            key={region.id}
            active={regionId === region.id}
            onClick={() => onRegionId(regionId === region.id ? null : region.id)}
          >
            {region.name}
          </Chip>
        ))}
      </div>

      <div className="thin-scroll chronicle-prose min-h-0 flex-1 overflow-y-auto">
        {narrating ? (
          <p className="p-3 text-[13px] text-muted">正在落笔……</p>
        ) : entries.length === 0 ? (
          <p className="p-3 text-[13px] text-muted">
            {regionId ? "此地暂无记载。" : "还没有值得记下的事，推进时间看看。"}
          </p>
        ) : (
          entries.map((entry) => (
            <Entry key={entry.tick} entry={entry} onVillager={onVillager} />
          ))
        )}
      </div>
    </Panel>
  );
}
