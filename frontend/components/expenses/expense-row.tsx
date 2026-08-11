"use client";

import type { Expense } from "@/lib/api-types";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/constants";
import { formatPKR } from "@/lib/money";
import { TrashIcon } from "@/components/icons";

export function ExpenseRow({
  e,
  canManage,
  onModify,
  onDelete,
}: {
  e: Expense;
  canManage: boolean;
  onModify: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink-900">
            {EXPENSE_CATEGORY_LABELS[e.category] ?? e.category}
          </p>
          <p className="mt-1 text-sm text-ink-500">
            {e.note || <span className="italic text-ink-300">No note</span>}
            {e.contact ? ` — ${e.contact.name}` : ""}
          </p>
          <p className="mt-0.5 text-xs text-ink-400">{new Date(e.date).toLocaleDateString()}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <p className="text-base font-bold text-ink-900">{formatPKR(parseFloat(e.amount))}</p>
          {canManage && (
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={onModify}
                className="rounded-xl bg-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-600 transition hover:bg-ink-200"
              >
                Modify
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="rounded-xl bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
              >
                <TrashIcon className="mr-0.5 inline h-3 w-3" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
