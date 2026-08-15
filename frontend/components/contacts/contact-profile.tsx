"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/apiClient";
import type { Contact, ContactDetail } from "@/lib/api-types";
import { formatPKR } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { ledgerHref } from "@/lib/ledger";
import { contactInitials, creditRemaining, creditUsed } from "@/lib/contacts";
import { TRANSACTION_TYPE_LABELS } from "@/lib/constants/transactions";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ContactTypePill } from "@/components/ui/type-pill";
import { useToast } from "@/components/ui/toast";
import { ChevronRightIcon, EyeIcon } from "@/components/icons";

const TX_STATUS_LABELS: Record<string, string> = {
  PAID: "Paid",
  PARTIAL: "Partial",
  PENDING: "Pending",
};

function CreditBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
      <div
        className={`h-full rounded-full ${used > limit ? "bg-error" : "bg-brand-600"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-ink-400">{label}</span>
      <span className="min-w-0 break-words text-right text-ink-900">{value}</span>
    </div>
  );
}

function StatCell({ label, value, tone }: { label: string; value: string; tone?: "brand" | "ink" | "error" }) {
  const toneClass =
    tone === "brand" ? "text-brand-600" : tone === "error" ? "text-error" : "text-ink-900";
  return (
    <div className="rounded-2xl bg-ink-50/70 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">{label}</p>
      <p className={`mt-0.5 text-sm font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

export function ContactProfile({
  contact,
  onClose,
}: {
  contact: Contact | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [detail, setDetail] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!contact) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const d = await apiRequest<ContactDetail>(`/contact/${contact.id}`);
        if (!cancelled) setDetail(d);
      } catch (err) {
        if (!cancelled) toast(err instanceof Error ? err.message : "Failed to load contact", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contact, toast]);

  const used = contact ? creditUsed(contact) : 0;
  const remaining = contact ? creditRemaining(contact) : 0;
  const limit = contact ? parseFloat(contact.creditLimit) || 0 : 0;
  const transactions = detail?.transactions ?? [];

  return (
    <Sheet open={!!contact} title={contact ? contact.name : ""} onClose={onClose} width="max-w-xl">
      {contact && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            {contact.photoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={contact.photoUrl}
                alt={contact.name}
                className="h-12 w-12 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink-100 text-sm font-bold text-ink-600">
                {contactInitials(contact.name)}
              </span>
            )}
            <div className="min-w-0">
              <ContactTypePill type={contact.type} />
              <p className="mt-1 truncate text-xs text-ink-500">
                {[contact.phone, contact.email].filter(Boolean).join(" · ") || "No contact info"}
              </p>
            </div>
            <Button variant="grey" className="ml-auto" onClick={() => router.push(ledgerHref(contact.id))}>
              <EyeIcon className="h-4 w-4" />
              Ledger
            </Button>
          </div>

          <div className="space-y-2 rounded-2xl border border-ink-100 p-4">
            {contact.phone && <InfoRow label="Phone" value={contact.phone} />}
            {contact.email && <InfoRow label="Email" value={contact.email} />}
            {contact.city && <InfoRow label="City" value={contact.city} />}
            {contact.address && <InfoRow label="Address" value={contact.address} />}
            {contact.cnic && <InfoRow label="CNIC" value={contact.cnic} />}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Credit summary</p>
            <div className="grid grid-cols-3 gap-2">
              <StatCell label="Limit" value={limit > 0 ? formatPKR(limit) : "—"} />
              <StatCell
                label="Used"
                value={used > 0 ? formatPKR(used) : "—"}
                tone={limit > 0 && used > limit ? "error" : "ink"}
              />
              <StatCell label="Remaining" value={limit > 0 ? formatPKR(remaining) : "—"} />
              <StatCell
                label="Debit (receivable)"
                value={parseFloat(contact.receivable) > 0 ? formatPKR(contact.receivable) : "—"}
                tone="brand"
              />
              <StatCell
                label="Credit (payable)"
                value={parseFloat(contact.payable) > 0 ? formatPKR(contact.payable) : "—"}
              />
              <StatCell label="Transactions" value={String(contact.transactionCount)} />
            </div>
            {limit > 0 && <div className="mt-2"><CreditBar used={used} limit={limit} /></div>}
          </div>

          {(contact.photoUrl || contact.cnicFrontUrl || contact.cnicBackUrl) && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Documents</p>
              <div className="space-y-3">
                {contact.photoUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={contact.photoUrl}
                    alt="Contact photo"
                    className="mx-auto max-h-64 rounded-2xl object-contain"
                  />
                )}
                {(contact.cnicFrontUrl || contact.cnicBackUrl) && (
                  <div className="grid grid-cols-2 gap-3">
                    {contact.cnicFrontUrl && (
                      <div>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                          CNIC front
                        </p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={contact.cnicFrontUrl}
                          alt="CNIC front"
                          className="w-full rounded-2xl object-contain"
                        />
                      </div>
                    )}
                    {contact.cnicBackUrl && (
                      <div>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                          CNIC back
                        </p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={contact.cnicBackUrl}
                          alt="CNIC back"
                          className="w-full rounded-2xl object-contain"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Recent transactions</p>
            {loading ? (
              <p className="py-3 text-sm text-ink-400">Loading…</p>
            ) : transactions.length === 0 ? (
              <p className="py-3 text-sm text-ink-400">No transactions yet.</p>
            ) : (
              <div className="divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-100">
                {transactions.slice(0, 3).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => router.push(`/print?type=${t.type}&id=${t.id}`)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-ink-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">
                        {t.number} · {TRANSACTION_TYPE_LABELS[t.type] ?? t.type}
                      </p>
                      <p className="text-xs text-ink-500">
                        {formatDateTime(t.createdAt)} · {TX_STATUS_LABELS[t.status] ?? t.status}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-ink-900">{formatPKR(t.total)}</span>
                    <ChevronRightIcon className="h-4 w-4 shrink-0 text-ink-300" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}
