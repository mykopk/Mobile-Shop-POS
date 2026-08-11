import { ReportCard } from "@/components/reports/report-card";
import { formatPKR } from "@/lib/money";

const MAX_BARS = 31;

function downsample(points: { date: string; value: number }[]) {
  if (points.length <= MAX_BARS) return points;
  const bucket = points.length / MAX_BARS;
  const out: { date: string; value: number }[] = [];
  for (let i = 0; i < MAX_BARS; i++) {
    const start = Math.floor(i * bucket);
    const end = Math.min(Math.ceil((i + 1) * bucket), points.length);
    const slice = points.slice(start, end);
    if (slice.length === 0) continue;
    const value = slice.reduce((s, p) => s + p.value, 0);
    const date = i === MAX_BARS - 1 ? slice[slice.length - 1].date : slice[0].date;
    out.push({ date, value });
  }
  return out;
}

function shortDate(d: string) {
  const [, m, day] = d.split("-");
  return `${Number(m)}/${Number(day)}`;
}

export function DailyBars({
  title,
  points,
  format = formatPKR,
}: {
  title: string;
  points: { date: string; value: number }[];
  format?: (value: number) => string;
}) {
  const bars = downsample(points);
  const max = Math.max(...bars.map((b) => b.value), 1);
  const height = (v: number) => (v > 0 ? Math.max((v / max) * 140, 6) : 2);

  return (
    <ReportCard title={title} sub={`${points.length} day(s)`}>
      {bars.length === 0 ? (
        <p className="text-sm text-ink-400">No data.</p>
      ) : (
        <div className="flex items-end gap-1">
          {bars.map((b) => (
            <div key={b.date} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t-md bg-brand-600/90"
                style={{ height: `${height(b.value)}px` }}
                title={`${shortDate(b.date)} · ${format(b.value)}`}
              />
              <span className="max-w-full truncate text-[9px] text-ink-400">{shortDate(b.date)}</span>
            </div>
          ))}
        </div>
      )}
    </ReportCard>
  );
}
