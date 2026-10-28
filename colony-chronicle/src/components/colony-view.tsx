"use client";

import { useEffect, useRef, useState } from "react";

import type { InterventionDef } from "@/lib/sim/intervene";
import { populationOf } from "@/lib/sim/world";

import { ChronicleFeed } from "./chronicle-feed";
import { InterventionBar } from "./intervention-bar";
import { RegionPanel } from "./region-panel";
import { RegionScene } from "./region-scene";
import { TopBar } from "./top-bar";
import { useColony } from "./use-colony";
import { VillagerPanel } from "./villager-panel";

const NOTICE_MS = 5000;

export function ColonyView() {
  const session = useColony();
  const [pending, setPending] = useState<InterventionDef | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  // The selection is mirrored in a ref because two clicks can land in the same
  // render, and reading `picked` from the closure would then drop the first one.
  const selection = useRef<string[]>([]);

  function choose(def: InterventionDef) {
    if (def.targets === 0) {
      session.intervene(def.kind, []);
      return;
    }
    setPending(def);
    selection.current = [];
    setPicked([]);
  }

  function cancel() {
    setPending(null);
    selection.current = [];
    setPicked([]);
  }

  function pick(regionId: string) {
    setFocusedId(regionId);
    // Picking the same place twice is always a mistake, and the engine would
    // just reject it after the player had spent the clicks.
    if (!pending || selection.current.includes(regionId)) return;
    selection.current = [...selection.current, regionId];
    if (selection.current.length < pending.targets) {
      setPicked(selection.current);
      return;
    }
    session.intervene(pending.kind, selection.current);
    cancel();
  }

  const { notice, setNotice } = session;
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice, setNotice]);

  const prompt = pending
    ? `${pending.label}：还要选 ${pending.targets - picked.length} 处`
    : null;
  const focused =
    session.world.regions.find((region) => region.id === focusedId) ??
    session.world.regions.reduce((best, region) =>
      populationOf(session.world, region.id) > populationOf(session.world, best.id) ? region : best,
    );

  return (
    <div className="flex h-screen flex-col">
      <TopBar
        world={session.world}
        events={session.events}
        autoPlay={session.playing}
        autoSpeedLabel={session.autoSpeedLabel}
        extinct={session.extinct}
        onAdvance={session.advanceDays}
        onAutoPlay={session.setAutoPlay}
        onCycleSpeed={session.cycleAutoSpeed}
        onNewWorld={session.startNewWorld}
        onLoadText={session.loadSaveText}
        onNotice={session.setNotice}
      />

      {session.extinct ? (
        <p className="shrink-0 border-b border-danger/40 bg-danger/10 px-3 py-1.5 text-xs text-danger">
          聚落上一个人也没有了。编年史到此为止——换个种子，或者读一份旧档，再看看另一种可能。
        </p>
      ) : null}

      {notice ? (
        <button
          type="button"
          onClick={() => setNotice(null)}
          className="shrink-0 border-b border-accent/30 bg-accent/10 px-3 py-1.5 text-left text-xs text-accent"
        >
          {notice}
        </button>
      ) : null}

      <main className="grid min-h-0 flex-1 gap-2 p-2 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,0.85fr)]">
        <div className="flex min-h-0 flex-col gap-2">
          <RegionPanel
            world={session.world}
            targeting={pending !== null}
            pickedIds={picked}
            focusedId={focused.id}
            onPick={pick}
            prompt={prompt}
          />
          <InterventionBar
            world={session.world}
            pending={pending}
            onChoose={choose}
            onCancel={cancel}
            disabled={session.extinct}
          />
        </div>

        <div className="flex min-h-0 flex-col gap-2">
          <RegionScene world={session.world} regionId={focused.id} />
          <ChronicleFeed
            world={session.world}
            entries={session.entries}
            narrating={session.narrating}
            regionId={session.chronicleRegionId}
            onRegionId={session.setChronicleRegionId}
            onVillager={session.setSelectedVillagerId}
          />
        </div>

        <VillagerPanel
          world={session.world}
          events={session.events}
          selectedId={session.selectedVillagerId}
          onSelect={session.setSelectedVillagerId}
          onClose={() => session.setSelectedVillagerId(null)}
        />
      </main>
    </div>
  );
}
