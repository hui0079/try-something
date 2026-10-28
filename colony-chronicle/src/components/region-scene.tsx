"use client";

import { WEATHER_LABEL } from "@/lib/chronicle/templates";
import { ratio } from "@/lib/sim/math";
import type { Region, World } from "@/lib/sim/types";
import { populationOf } from "@/lib/sim/world";

import { Panel } from "./ui";

function housesFor(shelter: number): number {
  if (shelter < 8) return 0;
  if (shelter < 32) return 1;
  if (shelter < 55) return 2;
  if (shelter < 80) return 3;
  return 4;
}

function blurb(world: World, region: Region, population: number): string {
  if (population === 0) return "没有人在这里停下。";
  const parts: string[] = [];
  if (region.shelter >= 80) parts.push("屋舍连成了片");
  else if (region.shelter >= 45) parts.push("棚屋挡住了风");
  else if (region.shelter >= 8) parts.push("还只有几处窝棚");
  else parts.push("人还在露天歇着");
  if (region.fertility < 22) parts.push("地力薄了");
  else if (region.food > population * 3) parts.push("田里长着庄稼");
  if (ratio(region.water, region.waterCap) < 0.18) parts.push("水快见底");
  else if (region.waterRecharge >= 4) parts.push("水从上游来");
  if (region.shrine) parts.push("石龛还立着");
  const order = world.orders?.find((item) => item.regionId === region.id);
  const realm = world.realms?.find((item) => item.regionIds.includes(region.id));
  if (realm) parts.push(`${realm.name}的旗帜立着`);
  else if (order) parts.push(`人们结成了${order.name}`);
  if ((world.folk?.[region.id] ?? 0) > 0) parts.push("部众跟着住");
  return `${parts.join("，")}。`;
}

function Hut({ smoke }: { smoke: boolean }) {
  return (
    <svg viewBox="0 0 40 36" className="h-10 w-11" aria-hidden>
      {smoke ? (
        <g className="scene-smoke">
          <circle cx="27" cy="8" r="1.4" fill="#e8ddc8" opacity="0.45" />
          <circle cx="29" cy="5" r="1.8" fill="#e8ddc8" opacity="0.3" />
        </g>
      ) : null}
      <polygon points="20,4 36,16 4,16" fill="#6e4c2c" />
      <rect x="8" y="16" width="24" height="16" fill="#8d6844" />
      <rect x="17" y="22" width="6" height="10" fill="#24180f" />
    </svg>
  );
}

function Walker({ index }: { index: number }) {
  return (
    <span
      className="scene-walker"
      style={{
        left: `${10 + (index % 5) * 14}%`,
        animationDuration: `${7 + (index % 4)}s`,
        animationDelay: `${index * 0.6}s`,
      }}
    >
      <svg viewBox="0 0 12 20" className="h-7 w-4" aria-hidden>
        <circle cx="6" cy="3.2" r="2.2" fill="#e8ddc8" />
        <path d="M4 6.5h4l1.2 7H2.8z" fill="#c4a574" />
        <path d="M4.2 13.5 3 19M7.8 13.5 9 19" stroke="#e8ddc8" strokeWidth="1.2" />
      </svg>
    </span>
  );
}

function Tree({ index }: { index: number }) {
  return (
    <svg viewBox="0 0 20 28" className="scene-tree h-14 w-9" style={{ animationDelay: `${index * 0.4}s` }} aria-hidden>
      <rect x="9" y="16" width="2" height="10" fill="#5a3d28" />
      <circle cx="10" cy="11" r="8" fill="#3f6a32" />
    </svg>
  );
}

export function RegionScene({ world, regionId }: { world: World; regionId: string }) {
  const region = world.regions.find((item) => item.id === regionId) ?? world.regions[0];
  const population = populationOf(world, region.id);
  const summary = blurb(world, region, population);
  const realmHere = world.realms?.find((item) => item.regionIds.includes(region.id));
  const houses = housesFor(region.shelter);
  const trees = Math.round(ratio(region.wood, region.woodCap) * 6);
  const crops =
    population === 0 || region.fertility < 18 ? 0 : Math.round(2 + ratio(region.fertility, 100) * 5);
  const people = Math.min(population, 6);
  const deer = ratio(region.game, region.gameCap) > 0.4 ? 2 : ratio(region.game, region.gameCap) > 0.12 ? 1 : 0;
  const waterHeight = 10 + ratio(region.water, region.waterCap) * 22;
  const wet = world.weather === "rain" || world.weather === "storm";
  const cold = world.weather === "coldSnap";

  return (
    <Panel
      title="景象"
      aside={
        <span className="text-[11px] text-muted">
          {region.name} · {WEATHER_LABEL[world.weather]} · {population > 0 ? `${population} 人` : "无人"}
        </span>
      }
      className="shrink-0"
    >
      <div
        role="img"
        aria-label={`${region.name}的景象，${summary}`}
        data-weather={world.weather}
        className={`scene-frame ${population === 0 ? "scene-empty" : ""}`}
      >
        <div className="scene-sky" />
        {wet ? (
          <div className="scene-rain" aria-hidden>
            {Array.from({ length: 14 }, (_, i) => (
              <span key={i} style={{ left: `${(i * 7) % 100}%`, animationDelay: `${(i % 5) * 0.15}s` }} />
            ))}
          </div>
        ) : null}
        {cold ? <div className="scene-frost" aria-hidden /> : null}
        <div className="scene-ridge" aria-hidden />
        <div className="scene-water" style={{ height: `${waterHeight}%` }} aria-hidden />
        <div className="scene-ground" aria-hidden />
        <div className="scene-fields" aria-hidden>
          {Array.from({ length: crops }, (_, i) => (
            <span key={i} className="scene-crop" style={{ animationDelay: `${i * 0.18}s` }} />
          ))}
        </div>
        <div className="scene-trees" aria-hidden>
          {Array.from({ length: trees }, (_, i) => (
            <Tree key={i} index={i} />
          ))}
        </div>
        {realmHere ? (
          <svg viewBox="0 0 20 28" className="absolute bottom-[46%] left-[10%] h-10 w-6" aria-hidden>
            <rect x="4" y="6" width="2" height="20" fill="#5a3d28" />
            <polygon points="6,4 18,8 6,13" fill={realmHere.arms > 0 ? "#8d3a32" : "#d9a54a"} />
          </svg>
        ) : null}
        <div className="scene-houses" aria-hidden>
          {Array.from({ length: houses }, (_, i) => (
            <Hut key={i} smoke={population > 0 && !wet} />
          ))}
          {region.shrine ? (
            <svg viewBox="0 0 22 28" className="h-10 w-6" aria-hidden>
              <polygon points="11,2 20,10 2,10" fill="#d9a54a" />
              <rect x="6" y="10" width="10" height="14" fill="#a88858" />
              <rect x="9" y="16" width="4" height="8" fill="#2a1c12" />
            </svg>
          ) : null}
        </div>
        {deer > 0 ? (
          <div className="scene-deer" aria-hidden>
            {Array.from({ length: deer }, (_, i) => (
              <svg key={i} viewBox="0 0 24 16" className="h-6 w-9">
                <ellipse cx="12" cy="10" rx="7" ry="3.2" fill="#8a6848" />
                <circle cx="18" cy="7" r="2.2" fill="#8a6848" />
                <path d="M16 5.5 15 2M19 5.2 20 2" stroke="#8a6848" strokeWidth="0.8" />
              </svg>
            ))}
          </div>
        ) : null}
        <div className="scene-folk" aria-hidden>
          {Array.from({ length: people }, (_, i) => (
            <Walker key={i} index={i} />
          ))}
        </div>
        <p className="scene-caption">
          <span className="text-foreground">{region.name}</span>
          <span className="text-muted">{summary}</span>
        </p>
      </div>
    </Panel>
  );
}
