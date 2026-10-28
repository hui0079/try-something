"use client";

import { INTERVENTIONS, type InterventionDef } from "@/lib/sim/intervene";
import { INFLUENCE_CAP } from "@/lib/sim/tick";
import type { World } from "@/lib/sim/types";

import { Panel } from "./ui";

export function InterventionBar({
  world,
  pending,
  onChoose,
  onCancel,
  disabled,
}: {
  world: World;
  pending: InterventionDef | null;
  onChoose: (def: InterventionDef) => void;
  onCancel: () => void;
  disabled: boolean;
}) {
  return (
    <Panel
      title="你的意志"
      aside={
        <span className="font-mono text-[11px] text-accent">
          影响力 {Math.floor(world.influence)} / {INFLUENCE_CAP}
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-1.5 p-3 sm:grid-cols-3">
        {INTERVENTIONS.map((def) => {
          const tooPoor = world.influence < def.cost;
          const active = pending?.kind === def.kind;
          return (
            <button
              key={def.kind}
              type="button"
              disabled={disabled || (tooPoor && !active)}
              title={`${def.description}（${def.cost} 点${def.targets > 0 ? `，需指定 ${def.targets} 处` : ""}）`}
              onClick={() => (active ? onCancel() : onChoose(def))}
              className={`flex items-baseline justify-between gap-1 rounded border px-2 py-1.5 text-xs transition-colors disabled:opacity-30 ${
                active
                  ? "border-accent bg-accent/20 text-accent"
                  : "border-line text-foreground/85 hover:border-accent/50 hover:text-accent"
              }`}
            >
              <span>{def.label}</span>
              <span className="font-mono text-[10px] text-muted">{def.cost}</span>
            </button>
          );
        })}
      </div>
      <p className="px-3 pb-3 text-[11px] leading-relaxed text-muted">
        {pending
          ? `${pending.description}。在左侧点选 ${pending.targets} 处地方，再点一次按钮可取消。`
          : "你能改天气、开渠修路、送来客人与灾病，但没法命令任何人做任何事。"}
      </p>
    </Panel>
  );
}
