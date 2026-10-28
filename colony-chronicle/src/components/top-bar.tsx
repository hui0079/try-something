"use client";

import { useRef, useState } from "react";

import { WEATHER_LABEL } from "@/lib/chronicle/templates";
import { saveFileName, serialize } from "@/lib/save";
import {
  calendarOf,
  DAYS_PER_SEASON,
  DAYS_PER_YEAR,
  SEASON_LABEL,
} from "@/lib/sim/calendar";
import type { SimEvent } from "@/lib/sim/events";
import { average } from "@/lib/sim/math";
import type { World } from "@/lib/sim/types";

import { Button, Stat } from "./ui";
import { DEFAULT_SEED, shareLink } from "./use-colony";

/**
 * Labelled in the game's own calendar. A whole year matters: villagers take
 * sixteen of them to grow up, so a chronicle worth reading is decades long and
 * clicking through it one day at a time is not a real option.
 */
const STEPS = [
  { days: DAYS_PER_YEAR, label: "1 年" },
  { days: DAYS_PER_SEASON, label: "1 季" },
  { days: 10, label: "10 天" },
  { days: 1, label: "1 天" },
] as const;

function download(world: World, events: readonly SimEvent[]): void {
  const blob = new Blob([serialize(world, events)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = saveFileName(world);
  link.click();
  // Revoking in the same turn races the download in some browsers and can
  // cancel it outright.
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function TopBar({
  world,
  events,
  autoPlay,
  autoSpeedLabel,
  extinct,
  onAdvance,
  onAutoPlay,
  onCycleSpeed,
  onNewWorld,
  onLoadText,
  onNotice,
}: {
  world: World;
  events: readonly SimEvent[];
  autoPlay: boolean;
  autoSpeedLabel: string;
  extinct: boolean;
  onAdvance: (days: number) => void;
  onAutoPlay: (value: boolean) => void;
  onCycleSpeed: () => void;
  onNewWorld: (seed: string) => void;
  onLoadText: (text: string) => void;
  onNotice: (text: string) => void;
}) {
  const [seedDraft, setSeedDraft] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const cal = calendarOf(world.tick);
  const totalFood = world.regions.reduce((sum, r) => sum + r.food, 0);
  const mood = average(world.villagers.map((v) => v.mood));

  async function share() {
    const link = shareLink(world.seed);
    try {
      await navigator.clipboard.writeText(link);
      onNotice(`已复制分享链接：${link}`);
    } catch {
      // Clipboard access is denied in plenty of contexts; showing the link is
      // just as useful as copying it.
      onNotice(`分享链接：${link}`);
    }
  }

  function pickFile(file: File | undefined) {
    if (!file) return;
    void file.text().then(onLoadText);
  }

  return (
    <header className="flex flex-col gap-2 border-b border-line bg-surface/60 px-3 py-2 lg:flex-row lg:items-center lg:gap-6">
      <div className="flex items-baseline gap-3">
        <h1 className="text-base font-medium tracking-wide text-accent">聚落编年史</h1>
        <span className="font-mono text-xs text-muted" title="世界种子">
          {world.seed}
        </span>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
        <Stat
          label="日期"
          value={`${cal.year} 年 ${SEASON_LABEL[cal.season]} ${cal.dayOfSeason} 日`}
          hint={`已过 ${world.tick} 天`}
        />
        <Stat
          label="天时"
          value={WEATHER_LABEL[world.weather]}
          hint={`还有 ${world.weatherDays} 天`}
        />
        <Stat
          label="人口"
          value={world.villagers.length + Object.values(world.folk ?? {}).reduce((sum, count) => sum + count, 0)}
          hint={`有名 ${world.villagers.length}，部众 ${Object.values(world.folk ?? {}).reduce((sum, count) => sum + count, 0)}`}
        />
        <Stat label="存粮" value={Math.round(totalFood)} hint="全境粮仓合计，单位是人日口粮" />
        <Stat label="心气" value={Math.round(mood)} />
        <Stat label="信仰" value={Math.round(world.faith)} />
      </div>

      <div className="flex flex-1 flex-wrap items-center justify-end gap-1.5">
        {STEPS.map((step) => (
          <Button
            key={step.days}
            variant="primary"
            disabled={extinct || autoPlay}
            onClick={() => onAdvance(step.days)}
          >
            推进 {step.label}
          </Button>
        ))}
        <Button disabled={extinct} onClick={() => onAutoPlay(!autoPlay)}>
          {autoPlay ? "暂停" : "自动"}
        </Button>
        <Button
          disabled={extinct}
          onClick={onCycleSpeed}
          title="自动按年往下走。再点一档更快，到顶后回到原速"
        >
          速度 {autoSpeedLabel}
        </Button>

        <span className="mx-1 h-4 w-px bg-line" aria-hidden />

        <input
          value={seedDraft}
          onChange={(e) => setSeedDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onNewWorld(seedDraft)}
          placeholder={DEFAULT_SEED}
          aria-label="世界种子"
          className="w-24 rounded border border-line bg-black/30 px-2 py-1 text-xs text-foreground placeholder:text-muted/60 focus:border-accent/60 focus:outline-none"
        />
        <Button onClick={() => onNewWorld(seedDraft)} title="同一个种子永远长出同一个世界">
          新世界
        </Button>
        <Button onClick={share}>分享</Button>
        <Button onClick={() => download(world, events)}>导出</Button>
        <Button onClick={() => fileInput.current?.click()}>导入</Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            pickFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
    </header>
  );
}
