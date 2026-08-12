"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/apiClient";
import { useDirtyForm } from "@/lib/use-dirty-form";
import { DiscardConfirmDialog } from "@/components/ui/discard-confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/dropdown";

export type ContactFormValues = {
  type: "CUSTOMER" | "VENDOR" | "WALK_IN" | "BOTH";
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  creditLimit: string;
};

export const EMPTY_CONTACT_FORM: ContactFormValues = {
  type: "CUSTOMER",
  name: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
  creditLimit: "",
};

type Duplicate = { id: string; name: string; phone: string | null; type: string };

const TYPE_OPTIONS = [
  { value: "CUSTOMER", label: "Customer" },
  { value: "VENDOR", label: "Vendor" },
  { value: "WALK_IN", label: "Walk-in" },
  { value: "BOTH", label: "Customer & vendor" },
];

export function ContactForm({
  initial,
  saving,
  onSave,
  onCancel,
}: {
  initial: ContactFormValues;
  saving: boolean;
  onSave: (values: ContactFormValues) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<ContactFormValues>(initial);
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const dirty = useDirtyForm(initial);

  function update(next: Partial<ContactFormValues>) {
    const updated = { ...form, ...next };
    setForm(updated);
    dirty.markDirty(updated);
  }

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!form.phone || form.phone.trim().length < 7) {
        setDuplicates([]);
        return;
      }
      try {
        const found = await apiRequest<Duplicate[]>(
          `/contact/dedupe?phone=${encodeURIComponent(form.phone)}`,
        );
        setDuplicates(found);
      } catch {
        setDuplicates([]);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [form.phone]);

  return (
    <form
      id="contact-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
    >
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500">Type</label>
          <Dropdown
            value={form.type}
            options={TYPE_OPTIONS}
            onChange={(value) => update({ type: value as ContactFormValues["type"] })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500">Name</label>
          <Input
            value={form.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="Full name"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500">
            Phone <span className="font-normal text-ink-400">(03XX…)</span>
          </label>
          <Input
            value={form.phone}
            onChange={(e) => update({ phone: e.target.value })}
            placeholder="0300 1234567"
            inputMode="tel"
          />
        </div>
        {duplicates.length > 0 && (
          <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
            <p className="font-semibold">Possible duplicate:</p>
            <ul className="mt-1 space-y-0.5">
              {duplicates.map((d) => (
                <li key={d.id}>
                  {d.name} {d.phone ? `(${d.phone})` : ""} — {d.type.toLowerCase()}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500">
            Email <span className="font-normal text-ink-400">(optional)</span>
          </label>
          <Input
            value={form.email}
            onChange={(e) => update({ email: e.target.value })}
            placeholder="name@example.com"
            inputMode="email"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500">
            Address <span className="font-normal text-ink-400">(optional)</span>
          </label>
          <Input
            value={form.address}
            onChange={(e) => update({ address: e.target.value })}
            placeholder="Shop / area"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500">
            Notes <span className="font-normal text-ink-400">(optional)</span>
          </label>
          <Input
            value={form.notes}
            onChange={(e) => update({ notes: e.target.value })}
            placeholder="Anything to remember"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500">
            Credit limit (PKR) <span className="font-normal text-ink-400">(optional)</span>
          </label>
          <Input
            value={form.creditLimit}
            onChange={(e) => update({ creditLimit: e.target.value })}
            placeholder="0"
            inputMode="numeric"
          />
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="grey" onClick={() => dirty.requestClose(onCancel)}>
          Cancel
        </Button>
        <Button type="submit" form="contact-form" loading={saving}>
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
