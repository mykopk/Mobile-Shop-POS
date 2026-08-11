"use client";

import { ReportNav } from "@/components/reports/report-nav";
import { PeriodPicker } from "@/components/reports/period-picker";
import { usePeriodReport } from "@/components/reports/use-period-report";
import { KpiCard } from "@/components/reports/report-card";
import { TopList } from "@/components/reports/top-list";
import { DailyBars } from "@/components/reports/daily-bars";
import { ReportTable } from "@/components/reports/report-table";
import type { PurchaseReport } from "@/lib/api-types";
import { formatPKR } from "@/lib/money";
import { REPORT_CONDITION_LABELS } from "@/lib/constants";

export default function PurchasesReportPage() {
  const { data, loading, range, setRange } = usePeriodReport<PurchaseReport>("/report/purchases");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-ink-900">Purchase report</h2>
        <p className="text-xs text-ink-500">Money spent buying stock, units bought and vendor breakdowns.</p>
      </div>

      <ReportNav />
      <PeriodPicker value={range} onChange={setRange} />

      {loading ? (
        <p className="text-sm text-ink-400">Loading…</p>
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Amount" value={formatPKR(data.amount)} sub={`${data.count} purchase(s)`} />
            <KpiCard label="Units bought" value={String(data.units)} sub="Across all purchases" />
            <KpiCard label="Discounts" value={formatPKR(data.discount)} sub={`Subtotal ${formatPKR(data.subtotal)}`} />
            <KpiCard label="Avg. purchase" value={formatPKR(data.count > 0 ? data.amount / data.count : 0)} sub="Amount per purchase" />
          </div>

          <DailyBars title="Daily purchases" points={data.daily.map((d) => ({ date: d.date, value: d.amount }))} />

          <div className="grid gap-3 lg:grid-cols-2">
            <TopList
              title="By condition"
              rows={data.byCondition.map((c) => ({
                label: REPORT_CONDITION_LABELS[c.condition] ?? c.condition,
                sub: `${c.units} unit(s)`,
                value: c.amount,
              }))}
              format={formatPKR}
            />
            <ReportTable
              columns={[
                { key: "vendor", label: "Vendor", render: (r) => <span className="font-medium text-ink-900">{r.name}</span> },
                { key: "count", label: "Purchases", align: "right", render: (r) => r.count },
                { key: "units", label: "Units", align: "right", render: (r) => r.units },
                { key: "amount", label: "Amount", align: "right", render: (r) => <span className="font-semibold text-ink-900">{formatPKR(r.amount)}</span> },
              ]}
              rows={data.byVendor}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
