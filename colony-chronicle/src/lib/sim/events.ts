import type { DeathCause, OrderKind, Season, Weather } from "./types";

/**
 * Events are the only thing the chronicle layer reads, so they carry display
 * names rather than ids alone. Nothing downstream may write world state.
 */
export type Severity = "minor" | "notable" | "major";

export type InterventionKind =
  | "rain"
  | "drought"
  | "coldSnap"
  | "warmSpell"
  | "releaseDeer"
  | "seedForest"
  | "digCanal"
  | "openRoad"
  | "manna"
  | "stranger"
  | "plague"
  | "revelation";

export type EventBody =
  | { type: "founding"; names: string[]; region: string }
  | { type: "season"; season: Season; year: number }
  | { type: "weather"; weather: Weather; region: string | null }
  | { type: "harvest"; region: string; regionId: string; amount: number; names: string[] }
  | { type: "hunt"; region: string; regionId: string; amount: number; name: string }
  | { type: "huntFail"; region: string; regionId: string; name: string }
  | { type: "injury"; name: string; id: string; region: string; regionId: string }
  | { type: "starving"; region: string; regionId: string; names: string[] }
  | { type: "thirsting"; region: string; regionId: string; names: string[] }
  | {
      type: "death";
      name: string;
      id: string;
      age: number;
      cause: DeathCause;
      region: string;
      regionId: string;
    }
  | { type: "birth"; name: string; id: string; motherName: string; region: string; regionId: string }
  | { type: "comingOfAge"; name: string; id: string; region: string; regionId: string }
  | { type: "mastery"; name: string; id: string; title: string; region: string; regionId: string }
  | { type: "pairing"; a: string; b: string; region: string; regionId: string }
  | { type: "departure"; name: string; id: string; region: string; regionId: string }
  | { type: "arrival"; name: string; id: string; region: string; regionId: string }
  | {
      type: "migration";
      names: string[];
      from: string;
      fromId: string;
      to: string;
      toId: string;
      reason: "hunger" | "thirst" | "crowding" | "schism" | "curiosity";
    }
  | { type: "build"; names: string[]; region: string; regionId: string; shelter: number }
  | { type: "bond"; a: string; b: string; region: string; regionId: string }
  | { type: "feud"; a: string; b: string; region: string; regionId: string }
  | { type: "faction"; region: string; regionId: string; leaderName: string; size: number }
  | { type: "schism"; from: string; fromId: string; to: string; toId: string; names: string[] }
  | { type: "recede"; name: string; id: string; childName: string; region: string; regionId: string }
  | {
      type: "order";
      name: string;
      kind: OrderKind;
      leaderName: string;
      region: string;
      regionId: string;
    }
  | { type: "realm"; name: string; era: string; rulerName: string; region: string; regionId: string }
  | {
      type: "secession";
      name: string;
      from: string;
      rulerName: string;
      region: string;
      regionId: string;
      names: string[];
    }
  | { type: "succession"; realm: string; predecessor: string; successor: string; region: string; regionId: string }
  | { type: "arms"; realm: string; region: string; regionId: string }
  | {
      type: "battle";
      attacker: string;
      defender: string;
      region: string;
      regionId: string;
      winner: string;
      fallen: string[];
    }
  | { type: "attrition"; region: string; regionId: string }
  | { type: "realmEnd"; name: string; region: string; regionId: string }
  | { type: "prayer"; names: string[]; region: string; regionId: string; faith: number }
  | { type: "depleted"; region: string; regionId: string; resource: "water" | "game" | "wood" | "fertility" | "food" }
  | {
      type: "recovered";
      region: string;
      regionId: string;
      resource: "water" | "game" | "wood" | "fertility" | "food";
    }
  | { type: "intervention"; kind: InterventionKind; regions: string[]; regionIds: string[] }
  | { type: "plague"; region: string; regionId: string; names: string[] }
  | {
      type: "yearSummary";
      year: number;
      population: number;
      births: number;
      deaths: number;
      departures: number;
      arrivals: number;
      food: number;
    }
  | { type: "collapse"; region: string };

export type SimEvent = EventBody & {
  tick: number;
  severity: Severity;
};

export type EventType = EventBody["type"];

export function makeEvent(tick: number, severity: Severity, body: EventBody): SimEvent {
  return { ...body, tick, severity };
}
