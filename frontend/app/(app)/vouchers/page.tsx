"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import type { BankAccount, Contact, Voucher } from "@/lib/api-types";
import { useApi } from "@/lib/use-api";
import { VOUCHER_STATUS_FILTERS, VOUCHER_TYPE_FILTERS } from "@/lib/constants";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { hasPermission } from "@/lib/roles";
import { formatPKR } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { FilterPill } from "@/components/ui/filter-pill";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
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

  const canCreateVouchers = hasPermission(user, PERMISSIONS.voucherCreate);
  const canManageVouchers = hasPermission(user, PERMISSIONS.voucherUpdate);

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
      <PageHeader
        title="Vouchers"
        subtitle="Cash receiving & cash payment records"
        action={
          !panelOpen && (
            <Button onClick={() => setPanelOpen(true)} disabled={!canCreateVouchers}>
              <PlusIcon className="h-4 w-4" />
              New voucher
            </Button>
          )
        }
      />

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
            <StatCard label="Received" value={formatPKR(totals.received)} variant="brand" />
            <StatCard label="Paid out" value={formatPKR(totals.paid)} variant="grey" />
            <StatCard
              label="Net cash"
              value={formatPKR(totals.net)}
              valueClassName={totals.net >= 0 ? "text-ink-900" : "text-brand-600"}
            />
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
              <EmptyState
                icon={<VoucherIcon className="h-10 w-10 text-ink-300" />}
                title={
                  vouchers && vouchers.length > 0
                    ? "No vouchers match these filters"
                    : "No vouchers yet — record cash in and cash out here"
                }
                action={
                  canCreateVouchers && vouchers && vouchers.length === 0 ? (
                    <Button variant="grey" onClick={() => setPanelOpen(true)}>
                      <PlusIcon className="h-4 w-4" />
                      Create your first voucher
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="space-y-2">
                {filtered.map((v) => (
                  <VoucherRow
                    key={v.id}
                    v={v}
                    canManage={canManageVouchers}
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
