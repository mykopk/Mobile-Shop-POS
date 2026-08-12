export const DEFAULT_TIMEZONE = "Asia/Karachi";

function offsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = Number(p.value);
  }
  if (map.hour === 24) map.hour = 0;
  const asUtc = Date.UTC(map.year, map.month - 1, map.day, map.hour, map.minute, map.second);
  return Math.round((asUtc - date.getTime()) / 60000);
}

export function dayKeyInTz(date: Date, timeZone: string): string {
  const off = offsetMinutes(date, timeZone);
  return new Date(date.getTime() + off * 60000).toISOString().slice(0, 10);
}

export function dateAtZone(dateStr: string, timeStr: string, timeZone: string): Date {
  const naive = new Date(`${dateStr}T${timeStr}Z`);
  let instant = naive;
  for (let i = 0; i < 3; i++) {
    const off = offsetMinutes(instant, timeZone);
    instant = new Date(naive.getTime() - off * 60000);
  }
  return instant;
}
