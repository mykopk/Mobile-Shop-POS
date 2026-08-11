"use client";

import { useState } from "react";
import { useApi } from "@/lib/use-api";
import type { Contact, LedgerReport, ReportRange } from "@/lib/api-types";
import { ReportNav } from "@/components/reports/report-nav";
import { PeriodPicker } from "@/components/reports/period-picker";
import { ReportTable } from "@/components/reports/report-table";
import { KpiCard, ReportCard } from "@/components/reports/report-card";
import { Dropdown } from "@/components/ui/dropdown";
import { formatPKR } from "@/lib/money";
import { toISODate } from "@/lib/dates";
import { LEDGER_TYPE_LABELS } from "@/lib/constants";

function buildPath(contactId: string, range: ReportRange) {
  const params = new URLSearchParams();
  if (range.from) params.set("from", range.from);
  if (range.to) params.set("to", range.to);
  const qs = params.toString();
  return qs ? `/report/ledger/${contactId}?${qs}` : `/report/ledger/${contactId}`;
}

export default function LedgerPage() {
  const { data: contacts, loading: loadingContacts } = useApi<Contact[]>("/contact");
  const from = new Date();
  from.setDate(from.getDate() - 29);
  const [contactId, setContactId] = useState("");
  const [range, setRange] = useState<ReportRange>({ from: toISODate(from), to: toISODate(new Date()) });

  const { data, loading } = useApi<LedgerReport>(contactId ? buildPath(contactId, range) : null);

  const selectedName = contacts?.find((c) => c.id === contactId)?.name ?? "Select a contact…";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-ink-900">Contact ledger</h2>
        <p className="text-xs text-ink-500">Every sale, payment, voucher and expense for one contact, with running balance.</p>
      </div>

      <ReportNav />

      <div className="flex flex-wrap items-center gap-2">
        {loadingContacts ? (
          <p className="text-sm text-ink-400">Loading contacts…</p>
        ) : (
          <Dropdown
            value={contactId}
            options={(contacts ?? []).map((c) => ({
              value: c.id,
              label: c.name,
              trailing: c.phone ? <span className="text-xs text-ink-400">{c.phone}</span> : undefined,
            }))}
            onChange={setContactId}
            trigger={
              <div className="flex min-w-56 items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm">
                <span className="truncate text-ink-900">{selectedName}</span>
              </div>
            }
            searchable
          />
        )}
        <PeriodPicker value={range} onChange={setRange} />
      </div>

      {!contactId ? (
        <p className="rounded-2xl bg-white p-6 text-sm text-ink-400">Pick a contact to view their ledger.</p>
      ) : loading ? (
        <p className="text-sm text-ink-400">Loading…</p>
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiCard label="Contact" value={data.contact.name} sub={data.contact.phone ?? "No phone"} />
            <KpiCard label="Entries" value={String(data.rows.length)} sub="Movements in this period" />
            <KpiCard
              label="Closing balance"
              value={formatPKR(data.closing)}
              sub={data.closing > 0 ? "Contact owes you" : data.closing < 0 ? "You owe the contact" : "Settled"}
            />
          </div>

          <ReportCard>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                {data.contact.name} — ledger
              </p>
              <p className="text-xs text-ink-400">
                Positive balance = contact owes you · negative = you owe the contact
              </p>
            </div>
            <ReportTable
              columns={[
                { key: "date", label: "Date", render: (r) => <span className="text-xs text-ink-500">{new Date(r.date).toLocaleDateString()}</span> },
                { key: "type", label: "Type", render: (r) => <span className="font-medium text-ink-900">{LEDGER_TYPE_LABELS[r.type] ?? r.type}</span> },
                { key: "ref", label: "Reference", render: (r) => <span className="font-mono text-xs text-ink-600">{r.ref}</span> },
                { key: "debit", label: "Debit", align: "right", render: (r) => (r.debit > 0 ? formatPKR(r.debit) : "—") },
                { key: "credit", label: "Credit", align: "right", render: (r) => (r.credit > 0 ? formatPKR(r.credit) : "—") },
                { key: "balance", label: "Balance", align: "right", render: (r) => <span className="font-semibold text-ink-900">{formatPKR(r.balance)}</span> },
              ]}
              rows={data.rows}
              empty="No movements for this contact in the selected period."
            />
          </ReportCard>
        </>
      ) : null}
    </div>
  );
}
