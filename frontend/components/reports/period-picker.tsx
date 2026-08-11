"use client";

import type { ReportRange } from "@/lib/api-types";
import { REPORT_QUICK_RANGES } from "@/lib/constants";
import { toISODate } from "@/lib/dates";
import { FilterPill } from "@/components/ui/filter-pill";

function quickRange(days: number): ReportRange {
  if (days === -1) return { from: undefined, to: undefined };
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from: toISODate(from), to: toISODate(new Date()) };
}

export function PeriodPicker({
  value,
  onChange,
}: {
  value: ReportRange;
  onChange: (range: ReportRange) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {REPORT_QUICK_RANGES.map((r) => {
        const target = quickRange(r.days);
        const active = value.from === target.from && value.to === target.to;
        return (
          <FilterPill key={r.key} active={active} onClick={() => onChange(target)}>
            {r.label}
          </FilterPill>
        );
      })}
      <div className="ml-1 flex items-center gap-2 rounded-full bg-white px-2 py-1">
        <input
          type="date"
          value={value.from ?? ""}
          onChange={(e) => onChange({ ...value, from: e.target.value || undefined })}
          className="bg-transparent text-xs text-ink-700 focus:outline-none"
        />
        <span className="text-ink-400">–</span>
        <input
          type="date"
          value={value.to ?? ""}
          onChange={(e) => onChange({ ...value, to: e.target.value || undefined })}
          className="bg-transparent text-xs text-ink-700 focus:outline-none"
        />
      </div>
    </div>
  );
}
