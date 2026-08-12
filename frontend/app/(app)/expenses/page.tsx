"use client";

import { useMemo, useState } from "react";
import { apiRequest } from "@/lib/apiClient";
import { useAuth } from "@/lib/auth-context";
import type { Expense } from "@/lib/api-types";
import { useApi } from "@/lib/use-api";
import { EXPENSE_CATEGORY_LABELS, EXPENSE_FILTERS, EXPENSE_TEXT } from "@/lib/constants";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { hasPermission } from "@/lib/roles";
import { formatPKR } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { FilterPill } from "@/components/ui/filter-pill";
import { Dialog } from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { ExpenseRow } from "@/components/expenses/expense-row";
import { PlusIcon, WalletIcon } from "@/components/icons";

export default function ExpensesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: expenses, loading, refetch } = useApi<Expense[]>("/expense");

  const [categoryFilter, setCategoryFilter] = useState<"ALL" | Expense["category"]>("ALL");
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);

  const canCreateExpenses = hasPermission(user, PERMISSIONS.expenseCreate);
  const canManageExpenses = hasPermission(user, PERMISSIONS.expenseUpdate);

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
      await apiRequest(`/expense/${deleting.id}`, { method: "DELETE" });
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
      <PageHeader
        title="Expenses"
        subtitle={EXPENSE_TEXT.subtitle}
        action={
          !panelOpen && (
            <Button onClick={() => setPanelOpen(true)} disabled={!canCreateExpenses}>
              <PlusIcon className="h-4 w-4" />
              New expense
            </Button>
          )
        }
      />

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
            <StatCard label={EXPENSE_TEXT.thisMonth} value={formatPKR(stats.month)} variant="brand" />
            <StatCard label={EXPENSE_TEXT.lastMonth} value={formatPKR(stats.last)} variant="grey" />
            <StatCard label={EXPENSE_TEXT.thisYear} value={formatPKR(stats.year)} />
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
              <EmptyState
                icon={<WalletIcon className="h-10 w-10 text-ink-300" />}
                title={
                  expenses && expenses.length > 0 ? EXPENSE_TEXT.noMatch : EXPENSE_TEXT.noData
                }
                action={
                  canCreateExpenses && expenses && expenses.length === 0 ? (
                    <Button variant="grey" onClick={() => setPanelOpen(true)}>
                      <PlusIcon className="h-4 w-4" />
                      Record your first expense
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="space-y-2">
                {filtered.map((e) => (
                  <ExpenseRow
                    key={e.id}
                    e={e}
                    canManage={canManageExpenses}
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
