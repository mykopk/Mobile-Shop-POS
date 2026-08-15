"use client";

import { PeriodPicker } from "@/components/reports/period-picker";
import { usePeriodReport } from "@/components/reports/use-period-report";
import { KpiCard } from "@/components/reports/report-card";
import { TopList } from "@/components/reports/top-list";
import type { PaymentsReport } from "@/lib/api-types";
import { formatPKR } from "@/lib/money";
import { pluralize } from "@/lib/pluralize";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";

export default function PaymentsReportPage() {
  const { data, loading, range, setRange } = usePeriodReport<PaymentsReport>("/report/payments");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-ink-900">Payments & cash flow</h2>
        <p className="text-xs text-ink-500">Money in and out by method, plus cash inflows and outflows.</p>
      </div>

      <PeriodPicker value={range} onChange={setRange} />

      {loading ? (
        <p className="text-sm text-ink-400">Loading…</p>
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard label="Money in" value={formatPKR(data.totalIn)} sub="Sales + credit recovered + vouchers" />
            <KpiCard label="Money out" value={formatPKR(data.totalOut)} sub="Purchases + expenses + vouchers" />
            <KpiCard
              label="Net flow"
              value={formatPKR(data.totalIn - data.totalOut)}
              sub={data.totalIn >= data.totalOut ? "Positive cash position" : "Cash going out faster than in"}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <TopList
              title="By payment method"
              rows={data.byMethod.map((m) => ({
                id: m.method,
                label: PAYMENT_METHOD_LABELS[m.method] ?? m.method,
                sub: `${pluralize(m.count, "payment")}`,
                value: m.amount,
              }))}
              format={formatPKR}
            />
            {data.byBankAccount.length > 0 && (
              <TopList
                title="By bank account"
                rows={data.byBankAccount.map((b) => ({
                  id: b.id,
                  label: b.name,
                  sub: `${b.bankName} · ${b.accountNo} · ${pluralize(b.count, "payment")}`,
                  value: b.amount,
                }))}
                format={formatPKR}
              />
            )}
            <TopList title="Cash inflows" rows={data.inflows.map((i) => ({ id: i.label, label: i.label, value: i.amount }))} format={formatPKR} />
            <TopList title="Cash outflows" rows={data.outflows.map((i) => ({ id: i.label, label: i.label, value: i.amount }))} format={formatPKR} />
          </div>
        </>
      ) : null}
    </div>
  );
}
