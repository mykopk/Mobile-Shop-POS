"use client";

import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { ReportNav } from "@/components/reports/report-nav";
import { PeriodPicker } from "@/components/reports/period-picker";
import { usePeriodReport } from "@/components/reports/use-period-report";
import { KpiCard, ReportCard } from "@/components/reports/report-card";
import { TopList } from "@/components/reports/top-list";
import type { ReportSummary } from "@/lib/api-types";
import { formatPKR } from "@/lib/money";
import { useAuth } from "@/lib/auth-context";
import { PAYMENT_METHOD_LABELS, REPORT_NAV } from "@/lib/constants";

export default function ReportsPage() {
  const { data, loading, range, setRange } = usePeriodReport<ReportSummary>("/report/summary");
  const { user } = useAuth();
  const admin = user?.role === "ADMIN" || user?.role === "MANAGER";
  const links = REPORT_NAV.slice(1).filter((i) => !i.adminOnly || admin);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-ink-900">Reports</h2>
        <p className="text-xs text-ink-500">Sales, purchases, profit, expenses, stock, cash and balances.</p>
      </div>

      <ReportNav />
      <PeriodPicker value={range} onChange={setRange} />

      {loading ? (
        <p className="text-sm text-ink-400">Loading…</p>
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Sales"
              value={formatPKR(data.sales.revenue)}
              sub={`${data.sales.count} sale(s) · ${data.itemsSold.total} item(s)`}
            />
            <KpiCard
              label="Purchases"
              value={formatPKR(data.purchases.amount)}
              sub={`${data.purchases.count} purchase(s)`}
            />
            <KpiCard
              label="Expenses"
              value={formatPKR(data.expenses.amount)}
              sub={`${data.expenses.count} expense(s)`}
            />
            {admin && data.profit !== null ? (
              <KpiCard label="Gross profit" value={formatPKR(data.profit)} sub="Revenue minus cost of goods" />
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
                label: PAYMENT_METHOD_LABELS[p.method] ?? p.method,
                value: p.amount,
              }))}
              format={formatPKR}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center justify-between rounded-2xl bg-white p-4 transition hover:bg-brand-50"
              >
                <span className="text-sm font-semibold text-ink-900">{item.label} report</span>
                <ArrowRightIcon className="h-4 w-4 text-ink-400 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
