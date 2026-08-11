"use client";

import type { Voucher } from "@/lib/api-types";
import { VOUCHER_METHOD_LABELS, VOUCHER_TYPE_LABELS } from "@/lib/constants";
import { formatPKR } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { PrinterIcon, XIcon } from "@/components/icons";
import Link from "next/link";

export function VoucherRow({
  v,
  canManage,
  printHref,
  onModify,
  onReverse,
}: {
  v: Voucher;
  canManage: boolean;
  printHref: string;
  onModify: () => void;
  onReverse: () => void;
}) {
  const inAmount = v.type === "RECEIVING";
  return (
    <div className="rounded-2xl bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-ink-900">{v.number}</p>
            <Badge variant="brand">{VOUCHER_TYPE_LABELS[v.type]}</Badge>
            <Badge variant={v.status === "ACTIVE" ? "neutral" : "muted"}>
              {v.status === "ACTIVE" ? "Active" : "Reversed"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-ink-500">
            {v.narration || <span className="italic text-ink-300">No narration</span>}
            {v.contact ? ` — ${v.contact.name}` : ""}
          </p>
          <p className="mt-0.5 text-xs text-ink-400">
            {VOUCHER_METHOD_LABELS[v.method]}
            {v.bankAccount ? ` · ${v.bankAccount.bankName}` : ""} ·{" "}
            {new Date(v.date).toLocaleDateString()} · by {v.user.name}
          </p>
          {v.status === "REVERSED" && v.reversedBy && (
            <p className="mt-0.5 text-xs text-ink-500">
              Reversed by {v.reversedBy.name}
              {v.reversedAt ? ` · ${new Date(v.reversedAt).toLocaleString()}` : ""}
              {v.reversalNote ? ` — ${v.reversalNote}` : ""}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <p className="text-base font-bold text-brand-600">
            {inAmount ? "+" : "-"}
            {formatPKR(parseFloat(v.amount))}
          </p>
          <div className="flex gap-1.5">
            <Link
              href={printHref}
              target="_blank"
              className="rounded-xl bg-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-600 transition hover:bg-ink-200"
            >
              <PrinterIcon className="mr-0.5 inline h-3 w-3" />
              Print
            </Link>
            {v.status === "ACTIVE" && canManage && (
              <>
                <button
                  type="button"
                  onClick={onModify}
                  className="rounded-xl bg-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-600 transition hover:bg-ink-200"
                >
                  Modify
                </button>
                <button
                  type="button"
                  onClick={onReverse}
                  className="rounded-xl bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
                >
                  <XIcon className="mr-0.5 inline h-3 w-3" />
                  Reverse
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
