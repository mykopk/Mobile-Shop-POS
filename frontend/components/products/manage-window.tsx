"use client";

import { useState } from "react";
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
import { useToast } from "@/components/ui/toast";

type ManageTab = "view" | "category" | "brand" | "color";

export function ManageWindow({
  categories,
  brands,
  colors,
  initialTab,
  token,
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
  token?: string | null;
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
      <div className="flex items-center gap-1 rounded-2xl bg-brand-100 p-1">
        {(
          [
            { value: "category", label: "Categories" },
            { value: "brand", label: "Brands" },
            { value: "color", label: "Colors" },
          ] as const
        ).map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`flex-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              tab === t.value ? "bg-brand-600 text-white" : "text-brand-700 hover:text-ink-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "category" ? (
        <CategoryList key={catKey} categories={categories ?? []} token={token ?? null} onChanged={() => { setCatKey((k) => k + 1); onChanged?.(); }} />
      ) : tab === "brand" ? (
        <BrandList key={brandKey} brands={brands ?? []} token={token ?? null} onChanged={() => { setBrandKey((k) => k + 1); onChanged?.(); }} />
      ) : (
        <ColorList key={colorKey} colors={colors ?? []} token={token ?? null} onChanged={() => { setColorKey((k) => k + 1); onChanged?.(); }} />
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

      <div className="flex items-center justify-between rounded-2xl bg-ink-50 px-4 py-3">
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
              className="flex cursor-pointer items-center gap-2.5 rounded-2xl bg-ink-50 px-4 py-3 text-sm font-medium text-ink-900"
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

function CategoryList({
  categories,
  token,
  onChanged,
}: {
  categories: Category[];
  token: string | null;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>("PHONE");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function addCategory() {
    if (!name.trim()) {
      toast("Name is required", "error");
      return;
    }
    setSaving(true);
    try {
      await apiRequest("/category", { method: "POST", body: { name: name.trim(), type }, token });
      setName("");
      onChanged();
      toast("Category added", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to add category", "error");
    } finally {
      setSaving(false);
    }
  }

  async function rename(c: Category, nextName: string) {
    if (!nextName.trim() || nextName.trim() === c.name) return;
    try {
      await apiRequest(`/category/${c.id}`, { method: "PUT", body: { name: nextName.trim() }, token });
      onChanged();
      toast("Category renamed", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to rename", "error");
    }
  }

  async function deactivate(c: Category) {
    try {
      await apiRequest(`/category/${c.id}/deactivate`, { method: "POST", token });
      onChanged();
      toast("Category deactivated", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to deactivate", "error");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiRequest(`/category/${deleteTarget.id}`, { method: "DELETE", token });
      setDeleteTarget(null);
      onChanged();
      toast("Category deleted", "success");
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
          <label className="mb-1 block text-xs font-semibold text-ink-500">New category</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Refurbished"
            onKeyDown={(e) => {
              if (e.key === "Enter") void addCategory();
            }}
          />
        </div>
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
            trigger={
              <div className="flex items-center justify-between rounded-2xl bg-ink-50 px-4 py-3 text-sm">
                <span className="text-ink-900">{type === "PHONE" ? "Phone" : "Accessory"}</span>
              </div>
            }
          />
        </div>
        <Button onClick={addCategory} disabled={saving}>
          {saving ? "Adding…" : "Add"}
        </Button>
      </div>

      <ScrollView className="mt-5">
        <div className="space-y-2">
          {categories.map((c) => (
            <div
              key={c.id}
              className={`flex items-center gap-3 rounded-2xl px-3.5 py-2.5 ${
                c.active ? "bg-ink-50" : "bg-ink-50 opacity-50"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="neutral">{c.type}</Badge>
                  <span className="text-sm font-medium text-ink-900">{c.name}</span>
                  {!c.active && <span className="text-xs text-ink-500">(inactive)</span>}
                </div>
                <p className="mt-0.5 text-xs text-ink-500">{c._count?.products ?? 0} product(s)</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = window.prompt("Rename category", c.name);
                  if (next) void rename(c, next);
                }}
                className="shrink-0 text-xs font-medium text-brand-600 hover:underline"
              >
                Rename
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(c)}
                className="shrink-0 text-xs font-medium text-ink-500 hover:text-ink-900 hover:underline"
              >
                Delete
              </button>
              {c.active ? (
                <button
                  type="button"
                  onClick={() => void deactivate(c)}
                  className="shrink-0 text-xs font-medium text-ink-500 hover:underline"
                >
                  Deactivate
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await apiRequest(`/category/${c.id}`, {
                        method: "PUT",
                        body: { active: true },
                        token,
                      });
                      onChanged();
                      toast("Category reactivated", "success");
                    } catch (err) {
                      toast(err instanceof Error ? err.message : "Failed to reactivate", "error");
                    }
                  }}
                  className="shrink-0 text-xs font-medium text-brand-600 hover:underline"
                >
                  Activate
                </button>
              )}
            </div>
          ))}
        </div>
      </ScrollView>

      <Dialog
        open={deleteTarget !== null}
        title="Delete category"
        message={
          deleteTarget
            ? `Delete "${deleteTarget.name}"? This permanently removes the category and cannot be undone. Categories with products can't be deleted.`
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

function BrandList({
  brands,
  token,
  onChanged,
}: {
  brands: Brand[];
  token: string | null;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function addBrand() {
    if (!name.trim()) {
      toast("Name is required", "error");
      return;
    }
    setSaving(true);
    try {
      await apiRequest("/brand", { method: "POST", body: { name: name.trim() }, token });
      setName("");
      onChanged();
      toast("Brand added", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to add brand", "error");
    } finally {
      setSaving(false);
    }
  }

  async function rename(b: Brand, nextName: string) {
    if (!nextName.trim() || nextName.trim() === b.name) return;
    try {
      await apiRequest(`/brand/${b.id}`, { method: "PUT", body: { name: nextName.trim() }, token });
      onChanged();
      toast("Brand renamed", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to rename", "error");
    }
  }

  async function deactivate(b: Brand) {
    try {
      await apiRequest(`/brand/${b.id}/deactivate`, { method: "POST", token });
      onChanged();
      toast("Brand deactivated", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to deactivate", "error");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiRequest(`/brand/${deleteTarget.id}`, { method: "DELETE", token });
      setDeleteTarget(null);
      onChanged();
      toast("Brand deleted", "success");
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
          <label className="mb-1 block text-xs font-semibold text-ink-500">New brand</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Samsung"
            onKeyDown={(e) => {
              if (e.key === "Enter") void addBrand();
            }}
          />
        </div>
        <Button onClick={addBrand} disabled={saving}>
          {saving ? "Adding…" : "Add"}
        </Button>
      </div>

      <ScrollView className="mt-5">
        <div className="space-y-2">
          {brands.map((b) => (
            <div
              key={b.id}
              className={`flex items-center gap-3 rounded-2xl px-3.5 py-2.5 ${
                b.active ? "bg-ink-50" : "bg-ink-50 opacity-50"
              }`}
            >
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-ink-900">{b.name}</span>
                {!b.active && <span className="text-xs text-ink-500"> (inactive)</span>}
                <p className="mt-0.5 text-xs text-ink-500">{b._count?.products ?? 0} product(s)</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = window.prompt("Rename brand", b.name);
                  if (next) void rename(b, next);
                }}
                className="shrink-0 text-xs font-medium text-brand-600 hover:underline"
              >
                Rename
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(b)}
                className="shrink-0 text-xs font-medium text-ink-500 hover:text-ink-900 hover:underline"
              >
                Delete
              </button>
              {b.active ? (
                <button
                  type="button"
                  onClick={() => void deactivate(b)}
                  className="shrink-0 text-xs font-medium text-ink-500 hover:underline"
                >
                  Deactivate
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await apiRequest(`/brand/${b.id}`, {
                        method: "PUT",
                        body: { active: true },
                        token,
                      });
                      onChanged();
                      toast("Brand reactivated", "success");
                    } catch (err) {
                      toast(err instanceof Error ? err.message : "Failed to reactivate", "error");
                    }
                  }}
                  className="shrink-0 text-xs font-medium text-brand-600 hover:underline"
                >
                  Activate
                </button>
              )}
            </div>
          ))}
        </div>
      </ScrollView>

      <Dialog
        open={deleteTarget !== null}
        title="Delete brand"
        message={
          deleteTarget
            ? `Delete "${deleteTarget.name}"? This permanently removes the brand and cannot be undone. Brands with products can't be deleted.`
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

function ColorList({
  colors,
  token,
  onChanged,
}: {
  colors: Color[];
  token: string | null;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Color | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function addColor() {
    if (!name.trim()) {
      toast("Name is required", "error");
      return;
    }
    setSaving(true);
    try {
      await apiRequest("/color", { method: "POST", body: { name: name.trim() }, token });
      setName("");
      onChanged();
      toast("Color added", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to add color", "error");
    } finally {
      setSaving(false);
    }
  }

  async function rename(c: Color, nextName: string) {
    if (!nextName.trim() || nextName.trim() === c.name) return;
    try {
      await apiRequest(`/color/${c.id}`, { method: "PUT", body: { name: nextName.trim() }, token });
      onChanged();
      toast("Color renamed", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to rename", "error");
    }
  }

  async function deactivate(c: Color) {
    try {
      await apiRequest(`/color/${c.id}/deactivate`, { method: "POST", token });
      onChanged();
      toast("Color deactivated", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to deactivate", "error");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiRequest(`/color/${deleteTarget.id}`, { method: "DELETE", token });
      setDeleteTarget(null);
      onChanged();
      toast("Color deleted", "success");
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
          <label className="mb-1 block text-xs font-semibold text-ink-500">New color</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Midnight"
            onKeyDown={(e) => {
              if (e.key === "Enter") void addColor();
            }}
          />
        </div>
        <Button onClick={addColor} disabled={saving}>
          {saving ? "Adding…" : "Add"}
        </Button>
      </div>

      <ScrollView className="mt-5">
        <div className="space-y-2">
          {colors.map((c) => (
            <div
              key={c.id}
              className={`flex items-center gap-3 rounded-2xl px-3.5 py-2.5 ${
                c.active ? "bg-ink-50" : "bg-ink-50 opacity-50"
              }`}
            >
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-ink-900">{c.name}</span>
                {!c.active && <span className="text-xs text-ink-500"> (inactive)</span>}
                <p className="mt-0.5 text-xs text-ink-500">{c._count?.products ?? 0} product(s)</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = window.prompt("Rename color", c.name);
                  if (next) void rename(c, next);
                }}
                className="shrink-0 text-xs font-medium text-brand-600 hover:underline"
              >
                Rename
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(c)}
                className="shrink-0 text-xs font-medium text-ink-500 hover:text-ink-900 hover:underline"
              >
                Delete
              </button>
              {c.active ? (
                <button
                  type="button"
                  onClick={() => void deactivate(c)}
                  className="shrink-0 text-xs font-medium text-ink-500 hover:underline"
                >
                  Deactivate
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await apiRequest(`/color/${c.id}`, {
                        method: "PUT",
                        body: { active: true },
                        token,
                      });
                      onChanged();
                      toast("Color reactivated", "success");
                    } catch (err) {
                      toast(err instanceof Error ? err.message : "Failed to reactivate", "error");
                    }
                  }}
                  className="shrink-0 text-xs font-medium text-brand-600 hover:underline"
                >
                  Activate
                </button>
              )}
            </div>
          ))}
        </div>
      </ScrollView>

      <Dialog
        open={deleteTarget !== null}
        title="Delete color"
        message={
          deleteTarget
            ? `Delete "${deleteTarget.name}"? This permanently removes the color and cannot be undone. Colors with products can't be deleted.`
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
