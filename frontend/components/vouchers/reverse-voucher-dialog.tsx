"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/apiClient";
import { useAuth } from "@/lib/auth-context";
import type { Voucher } from "@/lib/api-types";
import { VOUCHER_TYPE_LABELS } from "@/lib/constants";
import { formatPKR } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export function ReverseVoucherDialog({
  voucher,
  onClose,
  onReversed,
}: {
  voucher: Voucher;
  onClose: () => void;
  onReversed: () => void;
}) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await apiRequest(`/voucher/${voucher.id}/reverse`, {
        token,
        method: "POST",
        body: { note: note || undefined },
      });
      toast(`${voucher.number} reversed`, "success");
      onReversed();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not reverse voucher", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white px-4 py-4">
        <h3 className="text-lg font-bold text-ink-900">Reverse {voucher.number}</h3>
        <p className="mt-2 text-sm text-ink-500">
          Reversing this {VOUCHER_TYPE_LABELS[voucher.type].toLowerCase()} voucher of{" "}
          {formatPKR(parseFloat(voucher.amount))} voids it. It stays in the list marked Reversed
          for the audit trail.
        </p>
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
            Reason <span className="normal-case text-ink-400">(optional)</span>
          </p>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Wrong amount, entered twice…"
            className="bg-ink-100"
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="grey" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={busy} onClick={() => void confirm()}>
            Reverse voucher
          </Button>
        </div>
      </div>
    </div>
  );
}
