"use client";

import { useState } from "react";
import type { ProductSummary } from "@/lib/api-types";
import { CARRIER_OPTIONS, CARRIER_LABELS } from "@/lib/constants/units";
import { useDirtyForm } from "@/lib/use-dirty-form";
import { DiscardConfirmDialog } from "@/components/ui/discard-confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/dropdown";
import { DatePicker } from "@/components/ui/date-picker";

export type UnitFormValues = {
  productId: string;
  imei: string;
  condition: "NEW" | "USED";
  carrier: "NON_PTA" | "PTA" | "SIM_LOCKED";
  grade: string;
  batteryHealth: string;
  costPrice: string;
  acquiredAt: string;
};

export const EMPTY_UNIT_FORM: UnitFormValues = {
  productId: "",
  imei: "",
  condition: "NEW",
  carrier: "PTA",
  grade: "",
  batteryHealth: "",
  costPrice: "",
  acquiredAt: "",
};

const CONDITION_OPTIONS = [
  { value: "NEW", label: "New" },
  { value: "USED", label: "Used" },
];

export function UnitForm({
  initial,
  products,
  viewCosts,
  saving,
  onSave,
  onCancel,
}: {
  initial: UnitFormValues;
  products: ProductSummary[];
  viewCosts: boolean;
  saving: boolean;
  onSave: (values: UnitFormValues) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<UnitFormValues>(initial);
  const dirty = useDirtyForm(initial);

  function update(next: Partial<UnitFormValues>) {
    const updated = { ...form, ...next };
    setForm(updated);
    dirty.markDirty(updated);
  }

  return (
    <form
      id="unit-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
    >
      <div className="space-y-3">
        {initial.productId === "" && (
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500">Product</label>
            <Dropdown
              value={form.productId}
              onChange={(value) => update({ productId: value })}
              searchable
              placeholder="Select…"
              label={
                products.find((p) => p.id === form.productId)
                  ? `${products.find((p) => p.id === form.productId)!.brand} ${products.find((p) => p.id === form.productId)!.model}`
                  : undefined
              }
              options={[
                ...products.map((p) => ({
                  value: p.id,
                  label: `${p.brand} ${p.model}${p.storage ? ` ${p.storage}` : ""}${p.color ? ` · ${p.color}` : ""}`,
                })),
              ]}
            />
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500">IMEI</label>
          <Input
            value={form.imei}
            onChange={(e) => update({ imei: e.target.value })}
            placeholder="350014001234560"
            inputMode="numeric"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500">Condition</label>
            <Dropdown
              value={form.condition}
              options={CONDITION_OPTIONS}
              onChange={(value) => update({ condition: value as UnitFormValues["condition"] })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500">Carrier</label>
            <Dropdown
              value={form.carrier}
              options={CARRIER_OPTIONS.map((c) => ({ value: c, label: CARRIER_LABELS[c] }))}
              onChange={(value) => update({ carrier: value as UnitFormValues["carrier"] })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500">
              Grade <span className="font-normal text-ink-400">(optional)</span>
            </label>
            <Input
              value={form.grade}
              onChange={(e) => update({ grade: e.target.value })}
              placeholder="e.g. A"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500">
              Battery health % <span className="font-normal text-ink-400">(optional)</span>
            </label>
            <Input
              value={form.batteryHealth}
              onChange={(e) => update({ batteryHealth: e.target.value })}
              placeholder="e.g. 92"
              inputMode="numeric"
            />
          </div>
        </div>
        <div className={viewCosts ? "grid grid-cols-2 gap-3" : ""}>
          {viewCosts && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-500">Cost price (PKR)</label>
              <Input
                value={form.costPrice}
                onChange={(e) => update({ costPrice: e.target.value })}
                placeholder="0"
                inputMode="numeric"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500">
              Acquired date <span className="font-normal text-ink-400">(optional)</span>
            </label>
            <DatePicker
              value={form.acquiredAt}
              onChange={(value) => update({ acquiredAt: value })}
            />
          </div>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="grey" onClick={() => dirty.requestClose(onCancel)}>
          Cancel
        </Button>
        <Button type="submit" form="unit-form" loading={saving}>
          Save
        </Button>
      </div>

      <DiscardConfirmDialog
        open={dirty.confirmOpen}
        onConfirm={dirty.confirmDiscard}
        onCancel={dirty.cancelDiscard}
      />
    </form>
  );
}
