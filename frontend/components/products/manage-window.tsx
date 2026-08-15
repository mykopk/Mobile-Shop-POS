"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { apiRequest } from "@/lib/apiClient";
import type { Brand, Category, CategoryType, Color } from "@/lib/api-types";
import {
  INVENTORY_COLUMNS,
  DEFAULT_INVENTORY_VIEW,
  type InventoryColumnKey,
  type InventoryViewSettings,
} from "@/lib/constants/units";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dropdown } from "@/components/ui/dropdown";
import { Sheet } from "@/components/ui/sheet";
import { Dialog } from "@/components/ui/dialog";
import { ScrollView } from "@/components/ui/scroll-view";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useToast } from "@/components/ui/toast";

type ManageTab = "view" | "category" | "brand" | "color";

export function ManageWindow({
  categories,
  brands,
  colors,
  initialTab,
  onClose,
  onChanged,
  view,
  onViewChange,
  title = "Manage categories, brands & colors",
}: {
  categories?: Category[];
  brands?: Brand[];
  colors?: Color[];
  initialTab?: ManageTab;
  onClose: () => void;
  onChanged?: () => void;
  view?: InventoryViewSettings;
  onViewChange?: (next: InventoryViewSettings) => void;
  title?: string;
}) {
  const [tab, setTab] = useState<ManageTab>(initialTab ?? "category");
  const [catKey, setCatKey] = useState(0);
  const [brandKey, setBrandKey] = useState(0);
  const [colorKey, setColorKey] = useState(0);
  const hasView = view !== undefined && onViewChange !== undefined;

  if (hasView) {
    return (
      <Sheet open title={title} onClose={onClose} width="max-w-xl">
        <ViewTab view={view} onViewChange={onViewChange} />
      </Sheet>
    );
  }

  return (
    <Sheet open title={title} onClose={onClose} width="max-w-xl">
      <SegmentedControl
        className="w-full"
        value={tab}
        options={[
          { value: "category", label: "Categories" },
          { value: "brand", label: "Brands" },
          { value: "color", label: "Colors" },
        ]}
        onChange={(value) => setTab(value as ManageTab)}
      />

      {tab === "category" ? (
        <EntityList
          key={catKey}
          items={categories ?? []}
          onChanged={() => {
            setCatKey((k) => k + 1);
            onChanged?.();
          }}
          path="/category"
          noun="category"
          placeholder="e.g. Refurbished"
          hasType
          renderExtra={(c) => <Badge variant="neutral">{c.type}</Badge>}
        />
      ) : tab === "brand" ? (
        <EntityList
          key={brandKey}
          items={brands ?? []}
          onChanged={() => {
            setBrandKey((k) => k + 1);
            onChanged?.();
          }}
          path="/brand"
          noun="brand"
          placeholder="e.g. Samsung"
        />
      ) : (
        <EntityList
          key={colorKey}
          items={colors ?? []}
          onChanged={() => {
            setColorKey((k) => k + 1);
            onChanged?.();
          }}
          path="/color"
          noun="color"
          placeholder="e.g. Midnight"
        />
      )}
    </Sheet>
  );
}

function ViewTab({
  view,
  onViewChange,
}: {
  view: InventoryViewSettings;
  onViewChange: (next: InventoryViewSettings) => void;
}) {
  function toggleColumn(key: InventoryColumnKey) {
    onViewChange({ ...view, columns: { ...view.columns, [key]: !view.columns[key] } });
  }

  return (
    <div className="mt-5 space-y-5">
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">View mode</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onViewChange({ ...view, mode: "units" })}
            className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
              view.mode === "units" ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-700 hover:bg-brand-100"
            }`}
          >
            Units
          </button>
          <button
            type="button"
            onClick={() => onViewChange({ ...view, mode: "quantity" })}
            className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
              view.mode === "quantity" ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-700 hover:bg-brand-100"
            }`}
          >
            Quantity
          </button>
        </div>
        <p className="mt-1.5 text-xs text-ink-400">
          Units shows every IMEI with vendor details. Quantity shows one row per model with stock totals.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-ink-50 px-3.5 py-2">
        <div>
          <p className="text-sm font-semibold text-ink-900">Blur cost</p>
          <p className="text-xs text-ink-400">Hover to reveal. Cashiers stay blurred regardless.</p>
        </div>
        <Checkbox
          checked={view.blurCost}
          onChange={() => onViewChange({ ...view, blurCost: !view.blurCost })}
        />
      </div>

      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">Columns</p>
        <div className="grid grid-cols-2 gap-2">
          {INVENTORY_COLUMNS.map((c) => (
            <label
              key={c.key}
              className="flex cursor-pointer items-center gap-2.5 rounded-2xl bg-ink-50 px-3.5 py-2 text-sm font-medium text-ink-900"
            >
              <Checkbox checked={view.columns[c.key]} onChange={() => toggleColumn(c.key)} />
              {c.label}
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-ink-400">Visible columns in the Units view.</p>
      </div>

      <div className="flex justify-start">
        <Button variant="grey" onClick={() => onViewChange(DEFAULT_INVENTORY_VIEW)}>
          Reset view
        </Button>
      </div>
    </div>
  );
}

function EntityList<T extends { id: string; name: string; active: boolean; _count?: { products?: number } }>({
  items,
  onChanged,
  path,
  noun,
  placeholder,
  hasType = false,
  renderExtra,
}: {
  items: T[];
  onChanged: () => void;
  path: string;
  noun: string;
  placeholder: string;
  hasType?: boolean;
  renderExtra?: (item: T) => ReactNode;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>("PHONE");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const [deleting, setDeleting] = useState(false);
  const nounLabel = noun.charAt(0).toUpperCase() + noun.slice(1);
  const nounPlural = nounLabel + (noun.endsWith("y") ? "ies" : "s");

  async function add() {
    if (!name.trim()) {
      toast("Name is required", "error");
      return;
    }
    setSaving(true);
    try {
      await apiRequest(path, {
        method: "POST",
        body: hasType ? { name: name.trim(), type } : { name: name.trim() },
      });
      setName("");
      onChanged();
      toast(`${nounLabel} added`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : `Failed to add ${noun}`, "error");
    } finally {
      setSaving(false);
    }
  }

  async function rename(item: T, nextName: string) {
    if (!nextName.trim() || nextName.trim() === item.name) return;
    try {
      await apiRequest(`${path}/${item.id}`, { method: "PUT", body: { name: nextName.trim() } });
      onChanged();
      toast(`${nounLabel} renamed`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : `Failed to rename ${noun}`, "error");
    }
  }

  async function toggleActive(item: T) {
    try {
      if (item.active) {
        await apiRequest(`${path}/${item.id}/deactivate`, { method: "POST" });
        toast(`${nounLabel} deactivated`, "success");
      } else {
        await apiRequest(`${path}/${item.id}`, { method: "PUT", body: { active: true } });
        toast(`${nounLabel} reactivated`, "success");
      }
      onChanged();
    } catch (err) {
      toast(err instanceof Error ? err.message : `Failed to update ${noun}`, "error");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiRequest(`${path}/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      onChanged();
      toast(`${nounLabel} deleted`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="mt-5 flex items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-semibold text-ink-500">New {noun}</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={placeholder}
            onKeyDown={(e) => {
              if (e.key === "Enter") void add();
            }}
          />
        </div>
        {hasType && (
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500">Type</label>
            <Dropdown
              value={type}
              options={[
                { value: "PHONE", label: "Phone" },
                { value: "ACCESSORY", label: "Accessory" },
              ]}
              onChange={(value) => setType(value as CategoryType)}
              className="w-32"
            />
          </div>
        )}
        <Button onClick={add} loading={saving}>
          Add
        </Button>
      </div>

      <ScrollView className="mt-5">
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 rounded-2xl px-3.5 py-2.5 ${
                item.active ? "bg-ink-50" : "bg-ink-50 opacity-50"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {renderExtra?.(item)}
                  <span className="text-sm font-medium text-ink-900">{item.name}</span>
                  {!item.active && <span className="text-xs text-ink-500">(inactive)</span>}
                </div>
                <p className="mt-0.5 text-xs text-ink-500">{item._count?.products ?? 0} product(s)</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = window.prompt(`Rename ${noun}`, item.name);
                  if (next) void rename(item, next);
                }}
                className="shrink-0 text-xs font-medium text-brand-600 hover:underline"
              >
                Rename
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(item)}
                className="shrink-0 text-xs font-medium text-ink-500 hover:text-ink-900 hover:underline"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => void toggleActive(item)}
                className="shrink-0 text-xs font-medium text-brand-600 hover:underline"
              >
                {item.active ? "Deactivate" : "Activate"}
              </button>
            </div>
          ))}
        </div>
      </ScrollView>

      <Dialog
        open={deleteTarget !== null}
        title={`Delete ${noun}`}
        message={
          deleteTarget
            ? `Delete "${deleteTarget.name}"? This permanently removes the ${noun} and cannot be undone. ${nounPlural} with products can't be deleted.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
