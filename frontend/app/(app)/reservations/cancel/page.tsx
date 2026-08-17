"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/apiClient";
import { brandOf, type ReservationDetail } from "@/lib/api-types";
import { useApi } from "@/lib/use-api";
import { formatPKR } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { PlusIcon, ReservationIcon, XIcon } from "@/components/icons";

export default function CancelReservationPage() {
  const { toast } = useToast();
  const { data, loading, refetch } = useApi<ReservationDetail[]>(
    "/reservation?status=ACTIVE&type=RESERVATION",
  );
  const [cancelling, setCancelling] = useState<ReservationDetail | null>(null);
  const [refunded, setRefunded] = useState(true);
  const [busy, setBusy] = useState(false);

  const active = useMemo(
    () => (data ?? []).filter((r) => r.status === "ACTIVE" && r.type === "RESERVATION"),
    [data],
  );

  function openCancel(r: ReservationDetail) {
    setRefunded(parseFloat(r.advance) === 0);
    setCancelling(r);
  }

  async function confirmCancel() {
    if (!cancelling) return;
    setBusy(true);
    try {
      await apiRequest(`/reservation/${cancelling.id}/cancel`, {
        method: "POST",
        body: { refunded },
      });
      toast(
        `${cancelling.number} cancelled. ${
          refunded ? "Advance returned" : "Advance kept as debt on us"
        }`,
        "success",
      );
      setCancelling(null);
      void refetch();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't cancel the reservation", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-end gap-2">
        <Link href="/reservations/all">
          <Button variant="grey">
            <ReservationIcon className="h-4 w-4" />
            All Reservations
          </Button>
        </Link>
        <Link href="/reservations">
          <Button>
            <PlusIcon className="h-4 w-4" />
            New Reservation
          </Button>
        </Link>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto overscroll-none">
        {loading ? (
          <p className="py-8 text-center text-sm text-ink-400">Loading…</p>
        ) : active.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-ink-400">No active reservations.</p>
            <Link href="/reservations" className="mt-4 inline-block">
              <Button>
                <PlusIcon className="h-4 w-4" />
                New Reservation
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-ink-900">{r.number}</span>
                    <Badge variant="warning">Active</Badge>
                  </div>
                  <p className="mt-1 text-sm font-medium text-ink-900">
                    {r.contact.name}
                    {r.contact.phone ? ` · ${r.contact.phone}` : ""}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ink-500">
                    {r.items.map((i) => `${brandOf(i.product)} ${i.product.model}`).join(", ")}
                  </p>
                  <p className="mt-1 text-xs text-ink-400">
                    Reserved{" "}
                    {new Date(r.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-bold text-ink-900">{formatPKR(r.total)}</p>
                    <p className="text-xs text-ink-500">Advance {formatPKR(parseFloat(r.advance))}</p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => openCancel(r)}>
                    <XIcon className="h-3.5 w-3.5" />
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={cancelling !== null}
        title={`Cancel ${cancelling?.number ?? ""}?`}
        message={
          cancelling ? (
            <div className="space-y-3">
              <p>
                {cancelling.contact.name} paid an advance of {formatPKR(parseFloat(cancelling.advance))}.
                The reserved units will return to stock.
              </p>
              {parseFloat(cancelling.advance) > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Advance refund
                  </p>
                  <div className="flex items-center gap-1 rounded-2xl bg-brand-100 p-1">
                    <button
                      type="button"
                      onClick={() => setRefunded(true)}
                      className={`flex-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                        refunded ? "bg-brand-600 text-white" : "text-brand-700 hover:text-ink-900"
                      }`}
                    >
                      Paid back now
                    </button>
                    <button
                      type="button"
                      onClick={() => setRefunded(false)}
                      className={`flex-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                        !refunded ? "bg-brand-600 text-white" : "text-brand-700 hover:text-ink-900"
                      }`}
                    >
                      Not yet. We owe it
                    </button>
                  </div>
                  <p className="text-xs text-ink-500">
                    {refunded
                      ? "The advance is already back with the customer."
                      : `${formatPKR(parseFloat(cancelling.advance))} shows as debt on us until you mark it refunded.`}
                  </p>
                </div>
              )}
            </div>
          ) : null
        }
        confirmLabel="Cancel reservation"
        destructive
        busy={busy}
        onConfirm={() => void confirmCancel()}
        onCancel={() => setCancelling(null)}
      />
    </div>
  );
}
