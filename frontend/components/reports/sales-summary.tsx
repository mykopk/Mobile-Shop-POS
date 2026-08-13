"use client";

import { PeriodPicker } from "@/components/reports/period-picker";
import { usePeriodReport } from "@/components/reports/use-period-report";
import { KpiCard } from "@/components/reports/report-card";
import { TopList } from "@/components/reports/top-list";
import type { ReportSummary } from "@/lib/api-types";
import { formatPKR } from "@/lib/money";
import { pluralize } from "@/lib/pluralize";
import { useAuth } from "@/lib/auth-context";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { hasPermission } from "@/lib/roles";

export function SalesSummary() {
  const { data, loading, range, setRange } = usePeriodReport<ReportSummary>("/report/summary");
  const { user } = useAuth();
  const canViewAdminReports = hasPermission(user, PERMISSIONS.reportProfit);

  return (
    <div className="space-y-4">
      <PeriodPicker value={range} onChange={setRange} />

      {loading ? (
        <p className="text-sm text-ink-400">Loading…</p>
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard
              label="Sales"
              value={formatPKR(data.sales.revenue)}
              sub={`${pluralize(data.sales.count, "sale")} · ${pluralize(data.itemsSold.total, "item")}`}
            />
            <KpiCard
              label="Purchases"
              value={formatPKR(data.purchases.amount)}
              sub={pluralize(data.purchases.count, "purchase")}
            />
            <KpiCard
              label="Expenses"
              value={formatPKR(data.expenses.amount)}
              sub={pluralize(data.expenses.count, "expense")}
            />
            <KpiCard
              label="Vouchers"
              value={formatPKR(data.vouchers.receiving - data.vouchers.payment)}
              sub={`${formatPKR(data.vouchers.receiving)} in · ${formatPKR(data.vouchers.payment)} out`}
            />
            {canViewAdminReports && data.profit !== null ? (
              <KpiCard label="Net profit" value={formatPKR(data.profit)} sub="Revenue minus cost of goods and expenses" />
            ) : (
              <KpiCard
                label="Items sold"
                value={String(data.itemsSold.total)}
                sub={`${data.itemsSold.new} new · ${data.itemsSold.used} used`}
              />
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard label="Receivables" value={formatPKR(data.receivables)} sub="Money customers owe you" />
            <KpiCard label="Payables" value={formatPKR(data.payables)} sub="Money you owe suppliers" />
            <TopList
              title="Payment split"
              rows={data.paymentSplit.map((p) => ({
                id: p.method,
                label: PAYMENT_METHOD_LABELS[p.method] ?? p.method,
                value: p.amount,
              }))}
              format={formatPKR}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
