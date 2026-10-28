import { isContinuousMinutes, shanghaiClock } from "@/lib/time";

const MORNING_OPEN = 9 * 60 + 30;
const LUNCH_START = 11 * 60 + 30;
const AFTERNOON_OPEN = 13 * 60;

export function quoteWindowOpen(now: Date): boolean {
  const clock = shanghaiClock(now);
  if (clock.weekday === "Sat" || clock.weekday === "Sun") return false;
  return isContinuousMinutes(clock.minutes);
}

export function nextQuoteAt(now: Date, skipToday = false): Date {
  const clock = shanghaiClock(now);
  const weekend = clock.weekday === "Sat" || clock.weekday === "Sun";
  if (!skipToday && !weekend && clock.minutes < MORNING_OPEN) {
    return shanghaiInstant(clock.date, MORNING_OPEN);
  }
  if (!skipToday && !weekend && clock.minutes >= LUNCH_START && clock.minutes < AFTERNOON_OPEN) {
    return shanghaiInstant(clock.date, AFTERNOON_OPEN);
  }
  if (!skipToday && !weekend && isContinuousMinutes(clock.minutes)) return now;
  return nextWeekdayMorning(clock.date);
}

export function tradeGate(input: {
  now: Date;
  indexDate: string | null;
  volumeUnchanged: boolean;
  quotesStale: boolean;
}): { open: boolean; label: string } {
  const clock = shanghaiClock(input.now);
  const weekend = clock.weekday === "Sat" || clock.weekday === "Sun";
  if (weekend || !isContinuousMinutes(clock.minutes)) {
    return { open: false, label: "休市" };
  }
  if (input.quotesStale) return { open: false, label: "行情中断，暂停下单" };
  if (input.indexDate && input.indexDate !== clock.date) return { open: false, label: "休市" };
  if (!input.indexDate && input.volumeUnchanged) {
    return { open: false, label: "成交量未变，暂停下单" };
  }
  return { open: true, label: "连续竞价" };
}

export function sameVolumes(
  previous: Record<string, number> | null,
  volumes: Record<string, number>,
): boolean {
  if (!previous) return false;
  const codes = Object.keys(volumes);
  if (codes.length === 0) return false;
  return codes.every((code) => previous[code] === volumes[code]);
}

function shanghaiInstant(date: string, minutes: number): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, Math.floor(minutes / 60) - 8, minutes % 60));
}

function nextWeekdayMorning(date: string): Date {
  let cursor = shanghaiInstant(date, 12 * 60);
  for (let step = 0; step < 7; step += 1) {
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
    const clock = shanghaiClock(cursor);
    if (clock.weekday !== "Sat" && clock.weekday !== "Sun") {
      return shanghaiInstant(clock.date, MORNING_OPEN);
    }
  }
  return shanghaiInstant(shanghaiClock(cursor).date, MORNING_OPEN);
}
