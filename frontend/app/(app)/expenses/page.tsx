"use client";

import { useMemo, useState } from "react";
import { apiRequest } from "@/lib/apiClient";
import { useAuth } from "@/lib/auth-context";
import type { Expense } from "@/lib/api-types";
import { useApi } from "@/lib/use-api";
import { EXPENSE_CATEGORY_LABELS, EXPENSE_FILTERS, EXPENSE_TEXT } from "@/lib/constants";
import { formatPKR } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { FilterPill } from "@/components/ui/filter-pill";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { ExpenseRow } from "@/components/expenses/expense-row";
import { PlusIcon, WalletIcon } from "@/components/icons";

export default function ExpensesPage() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const { data: expenses, loading, refetch } = useApi<Expense[]>("/expense");

  const [categoryFilter, setCategoryFilter] = useState<"ALL" | Expense["category"]>("ALL");
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);

  const isCashier = user?.role === "CASHIER";

  const filtered = useMemo(() => {
    if (!expenses) return [];
    return expenses.filter((e) => categoryFilter === "ALL" || e.category === categoryFilter);
  }, [expenses, categoryFilter]);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    let month = 0;
    let last = 0;
    let year = 0;
    for (const e of expenses ?? []) {
      const value = parseFloat(e.amount) || 0;
      const t = new Date(e.date).getTime();
      if (t >= monthStart.getTime()) month += value;
      if (t >= lastStart.getTime() && t < monthStart.getTime()) last += value;
      if (t >= yearStart.getTime()) year += value;
    }
    return { month, last, year };
  }, [expenses]);

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await apiRequest(`/expense/${deleting.id}`, { token, method: "DELETE" });
      toast("Expense deleted", "success");
      setDeleting(null);
      void refetch();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not delete expense", "error");
      setDeleting(null);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex shrink-0 items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-ink-900">Expenses</h1>
          <p className="text-sm text-ink-500">{EXPENSE_TEXT.subtitle}</p>
        </div>
        {!panelOpen && (
          <Button onClick={() => setPanelOpen(true)} disabled={isCashier}>
            <PlusIcon className="h-4 w-4" />
            New expense
          </Button>
        )}
      </div>

      {panelOpen ? (
        <ExpenseForm
          key={editing?.id ?? "new"}
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
                {EXPENSE_TEXT.thisMonth}
              </p>
              <p className="mt-0.5 text-lg font-bold text-brand-700">{formatPKR(stats.month)}</p>
            </div>
            <div className="rounded-2xl bg-ink-100 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                {EXPENSE_TEXT.lastMonth}
              </p>
              <p className="mt-0.5 text-lg font-bold text-ink-700">{formatPKR(stats.last)}</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                {EXPENSE_TEXT.thisYear}
              </p>
              <p className="mt-0.5 text-lg font-bold text-ink-900">{formatPKR(stats.year)}</p>
            </div>
          </div>

          <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2">
            {EXPENSE_FILTERS.map((f) => (
              <FilterPill
                key={f.value}
                active={categoryFilter === f.value}
                onClick={() => setCategoryFilter(f.value)}
              >
                {f.label}
              </FilterPill>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pb-4">
            {loading ? (
              <p className="py-10 text-center text-sm text-ink-400">Loading expenses…</p>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl bg-white py-14 text-center">
                <WalletIcon className="h-10 w-10 text-ink-300" />
                <p className="text-sm text-ink-500">
                  {expenses && expenses.length > 0 ? EXPENSE_TEXT.noMatch : EXPENSE_TEXT.noData}
                </p>
                {!isCashier && expenses && expenses.length === 0 && (
                  <Button variant="grey" onClick={() => setPanelOpen(true)}>
                    <PlusIcon className="h-4 w-4" />
                    Record your first expense
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((e) => (
                  <ExpenseRow
                    key={e.id}
                    e={e}
                    canManage={!isCashier}
                    onModify={() => {
                      setEditing(e);
                      setPanelOpen(true);
                    }}
                    onDelete={() => setDeleting(e)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <Dialog
        open={!!deleting}
        title="Delete expense?"
        message={
          deleting ? (
            <span>
              This removes <span className="font-semibold text-ink-900">{formatPKR(parseFloat(deleting.amount))}</span>{" "}
              for {EXPENSE_CATEGORY_LABELS[deleting.category] ?? deleting.category}. This can&apos;t be undone.
            </span>
          ) : null
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
