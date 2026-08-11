export function toISODate(d: Date): string {
  const local = new Date(d);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 10);
}

export function formatDateTime(iso: string, separator = " "): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString()}${separator}${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}
