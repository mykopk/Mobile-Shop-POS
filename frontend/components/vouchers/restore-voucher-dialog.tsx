"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/apiClient";
import type { Voucher } from "@/lib/api-types";
import { VOUCHER_TYPE_LABELS } from "@/lib/constants";
import { formatPKR } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function RestoreVoucherDialog({
  voucher,
  onClose,
  onRestored,
}: {
  voucher: Voucher;
  onClose: () => void;
  onRestored: () => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await apiRequest(`/voucher/${voucher.id}/restore`, { method: "POST" });
      toast(`${voucher.number} re-opened`, "success");
      onRestored();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not re-open voucher", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white px-4 py-4">
        <h3 className="text-lg font-bold text-ink-900">Re-open {voucher.number}</h3>
        <p className="mt-2 text-sm text-ink-500">
          This makes the {VOUCHER_TYPE_LABELS[voucher.type].toLowerCase()} voucher of{" "}
          {formatPKR(parseFloat(voucher.amount))} active again and applies it back to the contact&apos;s
          balance. The reversal trail stays in the audit log.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="grey" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={busy} onClick={() => void confirm()}>
            Re-open voucher
          </Button>
        </div>
      </div>
    </div>
  );
}