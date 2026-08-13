"use client";

import { useApi } from "@/lib/use-api";
import type { BalancesReport } from "@/lib/api-types";
import { KpiCard } from "@/components/reports/report-card";
import { BalanceList } from "@/components/reports/balance-list";
import { formatPKR } from "@/lib/money";

export default function PayablesPage() {
  const { data, loading } = useApi<BalancesReport>("/report/balances");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-ink-900">Payables</h2>
        <p className="text-xs text-ink-500">Vendors you still owe, plus refunds due to customers.</p>
      </div>

      {loading ? (
        <p className="text-sm text-ink-400">Loading…</p>
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard label="Total payables" value={formatPKR(data.payableTotal)} sub="Money you owe" />
            <KpiCard label="Vendors" value={String(data.payables.length)} sub="Contacts you owe" />
            <KpiCard
              label="Largest"
              value={data.payables[0] ? formatPKR(data.payables[0].outstanding) : "—"}
              sub={data.payables[0]?.name ?? "No balances"}
            />
          </div>

          <BalanceList rows={data.payables} kind="payable" />
        </>
      ) : null}
    </div>
  );
}
