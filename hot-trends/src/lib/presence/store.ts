const ONLINE_WINDOW_MS = 60_000;

const VISITOR_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface PresenceStats {
  online: number;
  today: number;
}

export function isVisitorId(value: unknown): value is string {
  return typeof value === "string" && VISITOR_ID_PATTERN.test(value);
}

export function startOfShanghaiDay(timestamp: number): number {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
  return Date.parse(`${day}T00:00:00+08:00`);
}

export class PresenceStore {
  private readonly visitors = new Map<string, number>();

  touch(visitorId: string, now: number): PresenceStats {
    this.visitors.set(visitorId, now);
    this.prune(now);
    return this.stats(now);
  }

  private prune(now: number): void {
    const dayStart = startOfShanghaiDay(now);
    for (const [visitorId, seenAt] of this.visitors) {
      if (seenAt < dayStart) {
        this.visitors.delete(visitorId);
      }
    }
  }

  private stats(now: number): PresenceStats {
    const dayStart = startOfShanghaiDay(now);
    let online = 0;
    let today = 0;

    for (const seenAt of this.visitors.values()) {
      if (seenAt >= dayStart) {
        today += 1;
      }
      if (now - seenAt <= ONLINE_WINDOW_MS) {
        online += 1;
      }
    }

    return { online, today };
  }
}

export const presenceStore = new PresenceStore();
