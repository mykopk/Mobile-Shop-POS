"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { apiRequest } from "@/lib/apiClient";
import { useAuth } from "@/lib/auth-context";
import type { Expense } from "@/lib/api-types";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS, EXPENSE_TEXT } from "@/lib/constants";
import { formatPKR } from "@/lib/money";
import { toISODate } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/dropdown";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/components/ui/toast";
import { WalletIcon } from "@/components/icons";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-white p-4">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
        {label}
        {hint && <span className="normal-case text-ink-400"> {hint}</span>}
      </p>
      {children}
    </div>
  );
}

export function ExpenseForm({
  editing,
  onClose,
  onSaved,
}: {
  editing: Expense | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [category, setCategory] = useState(editing?.category ?? EXPENSE_CATEGORIES[0].value);
  const [amount, setAmount] = useState(editing?.amount ?? "");
  const [note, setNote] = useState(editing?.note ?? "");
  const [date, setDate] = useState(() => {
    if (editing) return toISODate(new Date(editing.date));
    return toISODate(new Date());
  });
  const [submitting, setSubmitting] = useState(false);

  async function save() {
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      toast("Enter a valid amount", "error");
      return;
    }
    if (!category) {
      toast("Pick a category", "error");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        category,
        amount: value,
        note: note || undefined,
        date,
      };
      if (editing) {
        await apiRequest(`/expense/${editing.id}`, { token, method: "PUT", body });
        toast("Expense updated", "success");
      } else {
        await apiRequest<Expense>("/expense", { token, method: "POST", body });
        toast("Expense recorded", "success");
      }
      onSaved();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save expense", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className="flex h-full flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div className="grid min-h-0 flex-1 gap-4 pb-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Field label={EXPENSE_TEXT.category}>
            <Dropdown
              value={category}
              options={EXPENSE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
              onChange={setCategory}
              trigger={
                <div className="flex items-center justify-between rounded-2xl bg-ink-100 px-4 py-3 text-sm">
                  <span className="truncate text-ink-900">
                    {EXPENSE_CATEGORY_LABELS[category] ?? category}
                  </span>
                </div>
              }
            />
          </Field>

          <Field label="Amount (Rs)">
            <div className="flex items-center rounded-2xl bg-ink-100 px-4 focus-within:ring-2 focus-within:ring-brand-500/60">
              <span className="text-lg font-bold text-ink-400">Rs</span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                inputMode="decimal"
                className="w-full bg-transparent px-3 py-3 text-2xl font-bold text-ink-900 outline-none"
                autoFocus
              />
            </div>
          </Field>

          <Field label={EXPENSE_TEXT.date}>
            <DatePicker value={date} onChange={setDate} />
          </Field>

          <Field label={EXPENSE_TEXT.note}>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={EXPENSE_TEXT.addNote}
              className="bg-ink-100"
            />
          </Field>
        </div>

        <div className="self-start lg:sticky lg:top-0">
          <ExpensePreview
            editing={editing}
            category={category}
            amount={amount}
            note={note}
            date={date}
          />
          <Button type="submit" className="mt-3 w-full" disabled={submitting}>
            {editing ? "Update expense" : "Record expense"}
          </Button>
          <Button variant="grey" type="button" className="mt-2 w-full" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}

function ExpensePreview({
  editing,
  category,
  amount,
  note,
  date,
}: {
  editing: Expense | null;
  category: string;
  amount: string;
  note: string;
  date: string;
}) {
  const value = parseFloat(amount) || 0;

  return (
    <div className="rounded-3xl border border-ink-100 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Expense preview</p>
        {editing && <p className="font-mono text-xs font-bold text-ink-300">···{editing.id.slice(-4)}</p>}
      </div>
      <div className="my-4 border-t border-dashed border-ink-200" />
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border-brand-200 bg-brand-50/60 text-brand-700">
          <WalletIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-base font-bold text-ink-900">
            {EXPENSE_CATEGORY_LABELS[category] ?? category}
          </p>
          <p className="text-xs text-ink-400">Money out</p>
        </div>
      </div>
      <p className="mt-4 text-3xl font-bold text-ink-900">{value > 0 ? formatPKR(value) : "Rs 0"}</p>
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-ink-400">{EXPENSE_TEXT.date}</span>
          <span className="font-semibold text-ink-900">
            {new Date(date).toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
        {note && (
          <div className="flex justify-between gap-3">
            <span className="text-ink-400">{EXPENSE_TEXT.note}</span>
            <span className="truncate font-semibold text-ink-900">{note}</span>
          </div>
        )}
      </div>
    </div>
  );
}
