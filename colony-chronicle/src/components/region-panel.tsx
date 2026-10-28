"use client";

import { ratio } from "@/lib/sim/math";
import type { Region, World } from "@/lib/sim/types";
import { folkOf, populationOf } from "@/lib/sim/world";

import { Meter, Panel } from "./ui";

/** Rations per head is the number that actually predicts whether people die. */
function foodTone(perHead: number): "danger" | "warn" | "good" {
  if (perHead < 3) return "danger";
  if (perHead < 8) return "warn";
  return "good";
}

function RegionCard({
  region,
  world,
  population,
  targeting,
  picked,
  focused,
  onPick,
}: {
  region: Region;
  world: World;
  population: number;
  targeting: boolean;
  picked: boolean;
  focused: boolean;
  onPick: () => void;
}) {
  const folk = folkOf(world, region.id);
  const heads = population + folk;
  const perHead = heads === 0 ? region.food : region.food / heads;
  const order = world.orders?.find((item) => item.regionId === region.id);
  const realm = world.realms?.find((item) => item.regionIds.includes(region.id));
  const linked = region.channels
    .map((id) => world.regions.find((r) => r.id === id)?.name)
    .filter((name): name is string => Boolean(name));

  const border = picked
    ? "border-accent bg-accent/10"
    : focused
      ? "border-accent/70 bg-accent/5"
      : targeting
        ? "border-accent/40 hover:border-accent hover:bg-accent/5"
        : heads > 0
          ? "border-line hover:border-accent/40"
          : "border-line/50 opacity-70 hover:border-accent/40";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onPick}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        onPick();
      }}
      className={`cursor-pointer rounded-lg border p-3 transition-colors ${border}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium text-foreground">
          {region.name}
          {region.shrine ? <span className="ml-1 text-accent" title="此地有神龛">祠</span> : null}
        </h3>
        <span className="shrink-0 font-mono text-[11px] text-muted">
          {heads > 0 ? `${population} 人${folk > 0 ? ` · 部众 ${folk}` : ""}` : "无人"}
        </span>
      </div>
      <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted">{region.terrain}</p>

      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
        <Meter
          label="口粮"
          value={Math.min(region.food, 120)}
          max={120}
          tone={foodTone(perHead)}
          hint={`粮仓 ${Math.round(region.food)}，人均 ${perHead.toFixed(1)} 天`}
        />
        <Meter
          label="水"
          value={region.water}
          max={region.waterCap}
          tone={ratio(region.water, region.waterCap) < 0.2 ? "danger" : "water"}
          hint={`每日回补 ${region.waterRecharge}`}
        />
        <Meter label="肥力" value={region.fertility} tone={region.fertility < 25 ? "warn" : "good"} />
        <Meter label="屋舍" value={region.shelter} tone="accent" />
        <Meter label="猎物" value={region.game} max={region.gameCap} tone="good" />
        <Meter label="木材" value={region.wood} max={region.woodCap} tone="accent" />
      </div>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted">
        <span>石 {Math.round(region.stone)}</span>
        {region.hasSalt ? <span>盐矿 {Math.round(region.salt)}</span> : null}
        {linked.length > 0 ? <span>渠通{linked.join("、")}</span> : null}
        {realm ? <span>{realm.name}</span> : order ? <span>{order.name}</span> : null}
      </div>
    </div>
  );
}

export function RegionPanel({
  world,
  targeting,
  pickedIds,
  focusedId,
  onPick,
  prompt,
}: {
  world: World;
  targeting: boolean;
  pickedIds: readonly string[];
  focusedId: string;
  onPick: (regionId: string) => void;
  prompt: string | null;
}) {
  return (
    <Panel
      title="地土"
      aside={
        prompt ? (
          <span className="text-[11px] text-accent">{prompt}</span>
        ) : (
          <span className="text-[11px] text-muted">{world.regions.length} 处</span>
        )
      }
      className="min-h-0"
    >
      <div className="thin-scroll grid min-h-0 flex-1 gap-2 overflow-y-auto p-3 sm:grid-cols-2">
        {world.regions.map((region) => (
          <RegionCard
            key={region.id}
            region={region}
            world={world}
            population={populationOf(world, region.id)}
            targeting={targeting}
            picked={pickedIds.includes(region.id)}
            focused={region.id === focusedId}
            onPick={() => onPick(region.id)}
          />
        ))}
      </div>
    </Panel>
  );
}
