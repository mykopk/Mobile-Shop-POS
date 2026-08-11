"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import type { BankAccount, Contact, Voucher } from "@/lib/api-types";
import { useApi } from "@/lib/use-api";
import { VOUCHER_STATUS_FILTERS, VOUCHER_TYPE_FILTERS } from "@/lib/constants";
import { formatPKR } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { FilterPill } from "@/components/ui/filter-pill";
import { VoucherForm } from "@/components/vouchers/voucher-form";
import { VoucherRow } from "@/components/vouchers/voucher-row";
import { ReverseVoucherDialog } from "@/components/vouchers/reverse-voucher-dialog";
import { PlusIcon, VoucherIcon } from "@/components/icons";

type TypeFilter = "ALL" | "RECEIVING" | "PAYMENT";
type StatusFilter = "ALL" | "ACTIVE" | "REVERSED";

export default function VouchersPage() {
  const { user } = useAuth();
  const { data: vouchers, loading, refetch } = useApi<Voucher[]>("/voucher");
  const { data: banks } = useApi<BankAccount[]>("/bank-account");
  const { data: contacts } = useApi<Contact[]>("/contact");

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<Voucher | null>(null);
  const [reversing, setReversing] = useState<Voucher | null>(null);

  const isCashier = user?.role === "CASHIER";

  const filtered = useMemo(() => {
    if (!vouchers) return [];
    return vouchers.filter(
      (v) =>
        (typeFilter === "ALL" || v.type === typeFilter) &&
        (statusFilter === "ALL" || v.status === statusFilter),
    );
  }, [vouchers, typeFilter, statusFilter]);

  const totals = useMemo(() => {
    let received = 0;
    let paid = 0;
    for (const v of vouchers ?? []) {
      if (v.status !== "ACTIVE") continue;
      const value = parseFloat(v.amount) || 0;
      if (v.type === "RECEIVING") received += value;
      else paid += value;
    }
    return { received, paid, net: received - paid };
  }, [vouchers]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex shrink-0 items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-ink-900">Vouchers</h1>
          <p className="text-sm text-ink-500">Cash receiving &amp; cash payment records</p>
        </div>
        {!panelOpen && (
          <Button onClick={() => setPanelOpen(true)} disabled={isCashier}>
            <PlusIcon className="h-4 w-4" />
            New voucher
          </Button>
        )}
      </div>

      {panelOpen ? (
        <VoucherForm
          key={editing?.id ?? "new"}
          contacts={contacts}
          banks={banks}
          editing={editing}
          onClose={() => {
            setPanelOpen(false);
            setEditing(null);
          }}
          onSaved={() => {
            setPanelOpen(false);
            setEditing(null);
            void refetch();
          }}
        />
      ) : (
        <>
          <div className="mb-3 grid shrink-0 grid-cols-3 gap-2">
            <div className="rounded-2xl bg-brand-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                Received
              </p>
              <p className="mt-0.5 text-lg font-bold text-brand-700">
                {formatPKR(totals.received)}
              </p>
            </div>
            <div className="rounded-2xl bg-ink-100 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Paid out</p>
              <p className="mt-0.5 text-lg font-bold text-ink-700">{formatPKR(totals.paid)}</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Net cash</p>
              <p
                className={`mt-0.5 text-lg font-bold ${
                  totals.net >= 0 ? "text-ink-900" : "text-brand-600"
                }`}
              >
                {formatPKR(totals.net)}
              </p>
            </div>
          </div>

          <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2">
            {VOUCHER_TYPE_FILTERS.map((f) => (
              <FilterPill
                key={f.value}
                active={typeFilter === f.value}
                onClick={() => setTypeFilter(f.value)}
              >
                {f.label}
              </FilterPill>
            ))}
            <span className="mx-1 h-4 w-px bg-ink-200" />
            {VOUCHER_STATUS_FILTERS.map((f) => (
              <FilterPill
                key={f.value}
                active={statusFilter === f.value}
                onClick={() => setStatusFilter(f.value)}
              >
                {f.label}
              </FilterPill>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pb-4">
            {loading ? (
              <p className="py-10 text-center text-sm text-ink-400">Loading vouchers…</p>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl bg-white py-14 text-center">
                <VoucherIcon className="h-10 w-10 text-ink-300" />
                <p className="text-sm text-ink-500">
                  {vouchers && vouchers.length > 0
                    ? "No vouchers match these filters"
                    : "No vouchers yet — record cash in and cash out here"}
                </p>
                {!isCashier && vouchers && vouchers.length === 0 && (
                  <Button variant="grey" onClick={() => setPanelOpen(true)}>
                    <PlusIcon className="h-4 w-4" />
                    Create your first voucher
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((v) => (
                  <VoucherRow
                    key={v.id}
                    v={v}
                    canManage={!isCashier}
                    printHref={`/print?type=VOUCHER&id=${v.id}`}
                    onModify={() => {
                      setEditing(v);
                      setPanelOpen(true);
                    }}
                    onReverse={() => setReversing(v)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {reversing && (
        <ReverseVoucherDialog
          voucher={reversing}
          onClose={() => setReversing(null)}
          onReversed={() => {
            setReversing(null);
            void refetch();
          }}
        />
      )}
    </div>
  );
}
