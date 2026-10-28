import type { SimEvent } from "@/lib/sim/events";
import type { Grave, Kin, Villager, World } from "@/lib/sim/types";

export type Subject = { id: string; name: string };

/** Fields that name the person the event is actually about. */
const PRINCIPAL_FIELDS = ["name", "motherName", "leaderName", "a", "b", "childName", "rulerName", "predecessor", "successor"] as const;

/**
 * Events name people rather than reference them, because the chronicle must be
 * readable without the world beside it. So a life story is assembled by looking
 * for the id where one is carried and the name everywhere else.
 *
 * Crowd events only count when they were worth recording in their own right: a
 * villager appears in the name list of every harvest they ever worked, and a
 * life told through those is a timesheet, not a story.
 */
export function mentions(event: SimEvent, subject: Subject): boolean {
  if ("id" in event && event.id === subject.id) return true;
  for (const field of PRINCIPAL_FIELDS) {
    if (field in event && (event as Record<string, unknown>)[field] === subject.name) return true;
  }
  if (event.severity === "minor") return false;
  if ("names" in event && Array.isArray(event.names) && event.names.includes(subject.name)) return true;
  return "fallen" in event && Array.isArray(event.fallen) && event.fallen.includes(subject.name);
}

/** The log index travels with the event because line ids are built from it. */
export type LifeRecord = { event: SimEvent; index: number };

/** Everything the chronicle recorded about one person, oldest first. */
export function lifeOf(events: readonly SimEvent[], subject: Subject): LifeRecord[] {
  const records: LifeRecord[] = [];
  events.forEach((event, index) => {
    if (mentions(event, subject)) records.push({ event, index });
  });
  return records;
}

export type Person =
  | { kind: "living"; villager: Villager }
  | { kind: "gone"; grave: Grave }
  | { kind: "kin"; kin: Kin };

/** Chronicle lines link by id, and the person they name is often already dead. */
export function findPerson(world: World, id: string): Person | null {
  const villager = world.villagers.find((v) => v.id === id);
  if (villager) return { kind: "living", villager };
  const grave = world.graves.find((g) => g.id === id);
  if (grave) return { kind: "gone", grave };
  const kin = world.kin?.find((person) => person.id === id);
  return kin ? { kind: "kin", kin } : null;
}
