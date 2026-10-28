"use client";

import { useMemo } from "react";

import { findPerson, lifeOf } from "@/lib/chronicle/biography";
import { dateLabel, renderLine } from "@/lib/chronicle/render";
import type { SimEvent } from "@/lib/sim/events";
import { DAYS_PER_YEAR } from "@/lib/sim/calendar";
import { SKILL_LABEL, titleOf } from "@/lib/sim/names";
import { describeTraits } from "@/lib/sim/traits";
import type { SkillKey, Villager, World } from "@/lib/sim/types";

import { ACTION_LABEL, CAUSE_LABEL, SEX_LABEL } from "./labels";
import { Meter, Panel } from "./ui";

const SKILL_ORDER: readonly SkillKey[] = ["farming", "hunting", "crafting", "healing"];

function vitalTone(value: number): "danger" | "warn" | "good" {
  if (value < 25) return "danger";
  if (value < 55) return "warn";
  return "good";
}

function Roster({
  world,
  selectedId,
  onSelect,
}: {
  world: World;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const byRegion = useMemo(() => {
    const groups = new Map<string, Villager[]>();
    for (const villager of world.villagers) {
      const list = groups.get(villager.regionId) ?? [];
      list.push(villager);
      groups.set(villager.regionId, list);
    }
    return groups;
  }, [world.villagers]);

  if (world.villagers.length === 0) {
    return <p className="p-3 text-[13px] text-muted">聚落已经没有人了。</p>;
  }

  return (
    <div className="p-2">
      {world.regions.map((region) => {
        const people = byRegion.get(region.id);
        if (!people || people.length === 0) return null;
        return (
          <div key={region.id} className="mb-2 last:mb-0">
            <h3 className="px-1 py-1 text-[11px] text-muted">{region.name}</h3>
            <ul>
              {people.map((villager) => (
                <li key={villager.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(villager.id)}
                    className={`flex w-full items-baseline gap-2 rounded px-1.5 py-1 text-left text-xs transition-colors ${
                      selectedId === villager.id
                        ? "bg-accent/15 text-accent"
                        : "text-foreground/85 hover:bg-white/5"
                    }`}
                  >
                    <span className="w-14 shrink-0 truncate">{villager.name}</span>
                    <span className="w-9 shrink-0 text-[11px] text-muted">{titleOf(villager)}</span>
                    <span className="w-6 shrink-0 font-mono text-[11px] text-muted">{villager.age}</span>
                    <span className="flex-1" />
                    <span
                      className="w-14 shrink-0 text-right text-[11px] text-muted"
                      title={`饱食 ${Math.round(villager.satiety)}　饮水 ${Math.round(villager.hydration)}　健康 ${Math.round(villager.health)}`}
                    >
                      {villager.lastAction ? ACTION_LABEL[villager.lastAction] : "—"}
                    </span>
                    <span
                      aria-hidden
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        Math.min(villager.health, villager.satiety, villager.hydration) < 25
                          ? "bg-danger"
                          : Math.min(villager.health, villager.satiety, villager.hydration) < 55
                            ? "bg-warn"
                            : "bg-good"
                      }`}
                    />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function Life({ events, subject }: { events: readonly SimEvent[]; subject: { id: string; name: string } }) {
  const lines = useMemo(
    () =>
      lifeOf(events, subject).map(({ event, index }) => {
        const line = renderLine(event, index);
        return { key: line.id, date: dateLabel(event.tick), text: line.text };
      }),
    [events, subject],
  );

  if (lines.length === 0) {
    return <p className="text-[12px] text-muted">编年史里还没有关于他的记载。</p>;
  }
  return (
    <ol className="chronicle-prose space-y-1">
      {lines.map((line) => (
        <li key={line.key} className="text-[12px] leading-relaxed text-foreground/85">
          <span className="mr-1.5 font-mono text-[10px] text-accent/70">{line.date}</span>
          {line.text}
        </li>
      ))}
    </ol>
  );
}

function FamilyLinks({
  world,
  personId,
  parents,
  onSelect,
}: {
  world: World;
  personId: string;
  parents: readonly string[];
  onSelect: (id: string) => void;
}) {
  const people = [
    ...world.villagers.map((v) => ({ id: v.id, name: v.name, parents: v.parents })),
    ...(world.kin ?? []).map((k) => ({ id: k.id, name: k.name, parents: k.parents })),
    ...world.graves.map((g) => ({ id: g.id, name: g.name, parents: g.parents ?? [] })),
  ];
  const elders = parents
    .map((id) => people.find((person) => person.id === id))
    .filter((person): person is { id: string; name: string; parents: string[] } => person !== undefined);
  const children = people.filter((person) => person.parents.includes(personId));
  return (
    <>
      {elders.length > 0 ? (
        <div className="flex gap-2">
          <dt className="w-10 shrink-0 text-muted">父母</dt>
          <dd className="flex flex-wrap gap-2">
            {elders.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => onSelect(person.id)}
                className="text-accent hover:underline"
              >
                {person.name}
              </button>
            ))}
          </dd>
        </div>
      ) : null}
      {children.length > 0 ? (
        <div className="flex gap-2">
          <dt className="w-10 shrink-0 text-muted">子女</dt>
          <dd className="flex flex-wrap gap-2">
            {children.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => onSelect(person.id)}
                className="text-accent hover:underline"
              >
                {person.name}
              </button>
            ))}
          </dd>
        </div>
      ) : null}
    </>
  );
}

function Detail({
  world,
  events,
  id,
  onSelect,
  onClose,
}: {
  world: World;
  events: readonly SimEvent[];
  id: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const person = findPerson(world, id);
  if (!person) {
    return <p className="p-3 text-[13px] text-muted">这个人不在名录里了。</p>;
  }

  const header = (subtitle: string, name: string) => (
    <div className="flex items-baseline justify-between gap-2 border-b border-line/60 px-3 py-2">
      <div>
        <span className="text-sm font-medium text-foreground">{name}</span>
        <span className="ml-2 text-[11px] text-muted">{subtitle}</span>
      </div>
      <button type="button" onClick={onClose} className="text-[11px] text-muted hover:text-accent">
        返回名录
      </button>
    </div>
  );

  if (person.kind === "kin") {
    const { kin } = person;
    const region = world.regions.find((r) => r.id === kin.regionId);
    return (
      <div className="min-h-0 flex-1 overflow-y-auto thin-scroll">
        {header(`退入${region?.name ?? "部众"}，不再单独记名`, kin.name)}
        <div className="space-y-3 p-3">
          <p className="chronicle-prose text-[13px] leading-relaxed text-foreground/90">
            名录只跟五十个人。{kin.name}把位子让给了后辈，人还在{region?.name ?? "当地"}的部众里。
          </p>
          <FamilyLinks world={world} personId={kin.id} parents={kin.parents} onSelect={onSelect} />
          <Life events={events} subject={kin} />
        </div>
      </div>
    );
  }

  if (person.kind === "gone") {
    const { grave } = person;
    return (
      <div className="min-h-0 flex-1 overflow-y-auto thin-scroll">
        {header(
          `${grave.kind === "death" ? "卒" : "离去"}于 ${grave.regionName}，年 ${grave.age}`,
          grave.name,
        )}
        <div className="space-y-3 p-3">
          <p className="chronicle-prose text-[13px] leading-relaxed text-foreground/90">{grave.epitaph}</p>
          <div className="text-[11px] text-muted">
            {grave.cause ? `因${CAUSE_LABEL[grave.cause]}。` : null}
            生于第 {Math.floor(grave.bornTick / DAYS_PER_YEAR) + 1} 年，{dateLabel(grave.tick)}记末。
          </div>
          <Life events={events} subject={grave} />
        </div>
      </div>
    );
  }

  const { villager } = person;
  const region = world.regions.find((r) => r.id === villager.regionId);
  const partner = villager.partnerId
    ? world.villagers.find((v) => v.id === villager.partnerId)
    : undefined;
  const seat = world.realms?.find((realm) => realm.rulerId === villager.id || realm.heirId === villager.id);
  const seatLabel =
    seat?.rulerId === villager.id ? `${seat.name}君主` : seat ? `${seat.name}储君` : null;
  const bonds = Object.entries(villager.relations)
    .flatMap(([otherId, value]) => {
      const other = world.villagers.find((v) => v.id === otherId);
      return other && Math.abs(value) >= 40 ? [{ other, value }] : [];
    })
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 6);

  return (
    <div className="thin-scroll min-h-0 flex-1 overflow-y-auto">
      {header(
        `${seatLabel ? `${seatLabel}・` : ""}${titleOf(villager)}・${villager.age} 岁・${SEX_LABEL[villager.sex]}・${region?.name ?? "野外"}`,
        villager.name,
      )}
      <div className="space-y-3 p-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <Meter label="饱食" value={villager.satiety} tone={vitalTone(villager.satiety)} />
          <Meter label="饮水" value={villager.hydration} tone={vitalTone(villager.hydration)} />
          <Meter label="健康" value={villager.health} tone={vitalTone(villager.health)} />
          <Meter label="心气" value={villager.mood} tone={vitalTone(villager.mood)} />
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {SKILL_ORDER.map((key) => (
            <Meter key={key} label={SKILL_LABEL[key]} value={villager.skills[key]} tone="accent" />
          ))}
        </div>

        <dl className="space-y-1 text-[11px]">
          <div className="flex gap-2">
            <dt className="w-10 shrink-0 text-muted">性情</dt>
            <dd className="text-foreground/85">{describeTraits(villager.traits)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-10 shrink-0 text-muted">今日</dt>
            <dd className="text-foreground/85">
              {villager.lastAction ? ACTION_LABEL[villager.lastAction] : "无事"}
              {villager.pregnancy !== null ? `・身孕 ${villager.pregnancy} 天` : ""}
            </dd>
          </div>
          {partner ? (
            <div className="flex gap-2">
              <dt className="w-10 shrink-0 text-muted">伴侣</dt>
              <dd>
                <button
                  type="button"
                  onClick={() => onSelect(partner.id)}
                  className="text-accent hover:underline"
                >
                  {partner.name}
                </button>
              </dd>
            </div>
          ) : null}
          <FamilyLinks world={world} personId={villager.id} parents={villager.parents} onSelect={onSelect} />
          {bonds.length > 0 ? (
            <div className="flex gap-2">
              <dt className="w-10 shrink-0 text-muted">交情</dt>
              <dd className="flex flex-wrap gap-2">
                {bonds.map(({ other, value }) => (
                  <button
                    key={other.id}
                    type="button"
                    onClick={() => onSelect(other.id)}
                    className={value > 0 ? "text-good hover:underline" : "text-danger hover:underline"}
                    title={`关系 ${Math.round(value)}`}
                  >
                    {other.name}
                  </button>
                ))}
              </dd>
            </div>
          ) : null}
        </dl>

        <div>
          <h4 className="mb-1 text-[11px] text-accent/80">生平</h4>
          <Life events={events} subject={villager} />
        </div>
      </div>
    </div>
  );
}

export function VillagerPanel({
  world,
  events,
  selectedId,
  onSelect,
  onClose,
}: {
  world: World;
  events: readonly SimEvent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <Panel
      title={selectedId ? "生平" : "居民"}
      aside={
        selectedId ? null : (
          <span className="font-mono text-[11px] text-muted">{world.villagers.length}/50</span>
        )
      }
      className="min-h-0"
    >
      {selectedId ? (
        <Detail
          world={world}
          events={events}
          id={selectedId}
          onSelect={onSelect}
          onClose={onClose}
        />
      ) : (
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto">
          <Roster world={world} selectedId={selectedId} onSelect={onSelect} />
        </div>
      )}
    </Panel>
  );
}
