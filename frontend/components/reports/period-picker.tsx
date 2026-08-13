"use client";

import type { ReportRange } from "@/lib/api-types";
import { REPORT_QUICK_RANGES } from "@/lib/constants";
import { toISODate } from "@/lib/dates";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { DatePicker } from "@/components/ui/date-picker";

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
  const activeKey =
    REPORT_QUICK_RANGES.find((r) => {
      const t = quickRange(r.days);
      return value.from === t.from && value.to === t.to;
    })?.key ?? "";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedControl
        options={REPORT_QUICK_RANGES.map((r) => ({ value: r.key, label: r.label }))}
        value={activeKey}
        onChange={(key) => {
          const range = REPORT_QUICK_RANGES.find((r) => r.key === key);
          if (range) onChange(quickRange(range.days));
        }}
      />
      <div className="ml-1 flex h-9 items-center gap-2">
        <DatePicker
          value={value.from ?? ""}
          onChange={(from) => onChange({ ...value, from: from || undefined })}
          className="w-36"
        />
        <span className="text-ink-400">–</span>
        <DatePicker
          value={value.to ?? ""}
          onChange={(to) => onChange({ ...value, to: to || undefined })}
          className="w-36"
        />
      </div>
    </div>
  );
}
