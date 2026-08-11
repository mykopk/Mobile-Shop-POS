import { ReportCard } from "@/components/reports/report-card";

export function TopList({
  title,
  rows,
  format,
}: {
  title: string;
  rows: { label: string; sub?: string; value: number }[];
  format?: (value: number) => string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <ReportCard title={title}>
      <div className="space-y-2.5">
        {rows.length === 0 && <p className="text-sm text-ink-400">No data.</p>}
        {rows.map((r) => (
          <div key={r.label} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="min-w-0 truncate font-medium text-ink-900">{r.label}</span>
              <span className="shrink-0 text-ink-700">
                {r.sub && <span className="text-xs text-ink-400">{r.sub} · </span>}
                {format ? format(r.value) : r.value}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full rounded-full bg-brand-600"
                style={{ width: `${(r.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </ReportCard>
  );
}
