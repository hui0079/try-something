export type ShanghaiClock = {
  date: string;
  minute: string;
  minutes: number;
  weekday: string;
};

export function shanghaiClock(now: Date): ShanghaiClock {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const hour = value("hour") === "24" ? "00" : value("hour");
  const minute = value("minute");
  const date = `${value("year")}-${value("month")}-${value("day")}`;
  return {
    date,
    minute: `${date}T${hour}:${minute}`,
    minutes: Number(hour) * 60 + Number(minute),
    weekday: value("weekday"),
  };
}

export function formatShanghai(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const hour = value("hour") === "24" ? "00" : value("hour");
  return `${value("year")}-${value("month")}-${value("day")} ${hour}:${value("minute")}:${value("second")}`;
}

export function isContinuousMinutes(minutes: number): boolean {
  const morning = minutes >= 9 * 60 + 30 && minutes < 11 * 60 + 30;
  const afternoon = minutes >= 13 * 60 && minutes < 14 * 60 + 57;
  return morning || afternoon;
}
