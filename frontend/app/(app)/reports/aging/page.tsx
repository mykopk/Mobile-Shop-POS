"use client";

import { useApi } from "@/lib/use-api";
import type { AgingSide, AgingReport } from "@/lib/api-types";
import { KpiCard } from "@/components/reports/report-card";
import { formatPKR } from "@/lib/money";
import { pluralize } from "@/lib/pluralize";
import { formatDateTime } from "@/lib/dates";
import { ledgerHref } from "@/lib/ledger";
import Link from "next/link";

const BUCKET_TONE: Record<string, string> = {
  current: "text-ink-900",
  d31_60: "text-amber-700",
  d61_90: "text-warning",
  over90: "text-error",
};

const BUCKET_LABEL: Record<string, string> = {
  current: "Current",
  d31_60: "31–60 days",
  d61_90: "61–90 days",
  over90: "90+ days",
};

function AgingSection({ side, kind }: { side: AgingSide; kind: "receivable" | "payable" }) {
  const overduePct = side.total > 0 ? Math.round((side.overdue / side.total) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={kind === "receivable" ? "Total receivable" : "Total payable"} value={formatPKR(side.total)} sub="Open balances" />
        <KpiCard
          label="Overdue"
          value={formatPKR(side.overdue)}
          sub={overduePct > 0 ? `${overduePct}% of balance is 31+ days old` : "Nothing overdue"}
        />
        {side.buckets.map((b) => (
          <KpiCard
            key={b.key}
            label={b.label}
            value={formatPKR(b.amount)}
            sub={pluralize(b.count, "invoice")}
          />
        ))}
      </div>

      {side.rows.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-sm text-ink-400">
          No open balances — nothing aging.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white">
          <table className="w-full text-sm">
            <thead className="bg-white">
              <tr className="text-left text-xs uppercase tracking-wide text-ink-500">
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Age</th>
                <th className="px-4 py-3 text-right">Outstanding</th>
                <th className="px-4 py-3 text-right">Bucket</th>
              </tr>
            </thead>
            <tbody>
              {side.rows.map((r) => (
                <tr key={r.id} className="border-t border-ink-100">
                  <td className="px-4 py-2.5">
                    <Link
                      href={ledgerHref(r.contactId)}
                      className="font-medium text-ink-900 hover:text-brand-600"
                    >
                      {r.name}
                    </Link>
                    {r.phone ? <p className="text-xs text-ink-400">{r.phone}</p> : null}
                  </td>
                  <td className="px-4 py-2.5 text-ink-700">{r.number}</td>
                  <td className="px-4 py-2.5 text-ink-500">{formatDateTime(r.date)}</td>
                  <td className="px-4 py-2.5 text-right text-ink-700">{r.ageDays}d</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-ink-900">
                    {formatPKR(r.outstanding)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={BUCKET_TONE[r.bucket] ?? "text-ink-900"}>
                      {BUCKET_LABEL[r.bucket] ?? r.bucket}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AgingPage() {
  const { data, loading } = useApi<AgingReport>("/report/aging");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-ink-900">Credit aging</h2>
        <p className="text-xs text-ink-500">
          How long open credit balances have been outstanding, bucketed by invoice age.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-ink-400">Loading…</p>
      ) : data ? (
        <>
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-ink-900">Receivables — money owed to you</h3>
            <AgingSection side={data.receivables} kind="receivable" />
          </section>
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-ink-900">Payables — money you owe</h3>
            <AgingSection side={data.payables} kind="payable" />
          </section>
        </>
      ) : null}
    </div>
  );
}
