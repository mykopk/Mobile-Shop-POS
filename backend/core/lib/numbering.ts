export async function nextNumber(
  load: () => Promise<{ number: string }[]>,
  prefix: string,
): Promise<string> {
  const rows = await load();
  let max = 0;
  for (const r of rows) {
    const m = r.number.match(/-(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}
