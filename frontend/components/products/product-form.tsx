"use client";

import { useState } from "react";
import type { Brand, Category, Color } from "@/lib/api-types";
import { RAM_OPTIONS, SCREEN_SIZE_OPTIONS, STORAGE_OPTIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/dropdown";
import { ImagePicker } from "@/components/products/image-picker";

export type ProductFormValues = {
  brandId: string;
  model: string;
  storage: string;
  ram: string;
  screenSize: string;
  colorId: string;
  categoryId: string;
  sellPrice: string;
  costPrice: string;
  retailPrice: string;
  image: string;
};

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  brandId: "",
  model: "",
  storage: "",
  ram: "",
  screenSize: "",
  colorId: "",
  categoryId: "",
  sellPrice: "",
  costPrice: "",
  retailPrice: "",
  image: "",
};

export function ProductForm({
  initial,
  brands,
  categories,
  colors,
  viewCosts,
  saving,
  onSave,
  onCancel,
}: {
  initial: ProductFormValues;
  brands: Brand[];
  categories: Category[];
  colors: Color[];
  viewCosts: boolean;
  saving: boolean;
  onSave: (values: ProductFormValues) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<ProductFormValues>(initial);

  return (
    <form
      id="product-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500">Brand</label>
            <Dropdown
              value={form.brandId}
              options={brands.map((b) => ({ value: b.id, label: b.name }))}
              onChange={(value) => setForm({ ...form, brandId: value })}
              trigger={
                <div className="flex items-center justify-between rounded-2xl bg-ink-50 px-4 py-3 text-sm">
                  <span className="text-ink-900">
                    {brands.find((b) => b.id === form.brandId)?.name ?? "Select…"}
                  </span>
                </div>
              }
            />
          </div>
          <Input
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
            placeholder="Model"
            className="self-end"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500">Storage</label>
            <Dropdown
              value={form.storage}
              options={STORAGE_OPTIONS.map((s) => ({ value: s, label: s }))}
              onChange={(value) => setForm({ ...form, storage: value })}
              searchable
              allowCustom
              trigger={
                <div className="flex items-center justify-between rounded-2xl bg-ink-50 px-4 py-3 text-sm">
                  <span className="text-ink-900">{form.storage || "Select…"}</span>
                </div>
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500">RAM</label>
            <Dropdown
              value={form.ram}
              options={RAM_OPTIONS.map((r) => ({ value: r, label: r }))}
              onChange={(value) => setForm({ ...form, ram: value })}
              searchable
              allowCustom
              trigger={
                <div className="flex items-center justify-between rounded-2xl bg-ink-50 px-4 py-3 text-sm">
                  <span className="text-ink-900">{form.ram || "Select…"}</span>
                </div>
              }
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500">Screen size</label>
            <Dropdown
              value={form.screenSize}
              options={SCREEN_SIZE_OPTIONS.map((s) => ({ value: s, label: s }))}
              onChange={(value) => setForm({ ...form, screenSize: value })}
              searchable
              allowCustom
              trigger={
                <div className="flex items-center justify-between rounded-2xl bg-ink-50 px-4 py-3 text-sm">
                  <span className="text-ink-900">{form.screenSize || "Select…"}</span>
                </div>
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500">Color</label>
            <Dropdown
              value={form.colorId}
              options={colors.map((c) => ({ value: c.id, label: c.name }))}
              onChange={(value) => setForm({ ...form, colorId: value })}
              searchable
              trigger={
                <div className="flex items-center justify-between rounded-2xl bg-ink-50 px-4 py-3 text-sm">
                  <span className="text-ink-900">
                    {colors.find((c) => c.id === form.colorId)?.name ?? "Select…"}
                  </span>
                </div>
              }
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500">Category</label>
          <Dropdown
            value={form.categoryId}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            onChange={(value) => setForm({ ...form, categoryId: value })}
            trigger={
              <div className="flex items-center justify-between rounded-2xl bg-ink-50 px-4 py-3 text-sm">
                <span className="text-ink-900">
                  {categories.find((c) => c.id === form.categoryId)?.name ?? "Select…"}
                </span>
              </div>
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500">Sell price (PKR)</label>
            <Input
              value={form.sellPrice}
              onChange={(e) => setForm({ ...form, sellPrice: e.target.value })}
              placeholder="0"
              inputMode="numeric"
            />
          </div>
          {viewCosts && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-500">Cost price (PKR)</label>
              <Input
                value={form.costPrice}
                onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                placeholder="0"
                inputMode="numeric"
              />
            </div>
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500">
            Retail price (PKR) <span className="font-normal text-ink-400">— invoice / company MRP (optional)</span>
          </label>
          <Input
            value={form.retailPrice}
            onChange={(e) => setForm({ ...form, retailPrice: e.target.value })}
            placeholder="0"
            inputMode="numeric"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500">
            Image <span className="font-normal text-ink-400">(optional)</span>
          </label>
          <ImagePicker value={form.image} onChange={(value) => setForm({ ...form, image: value })} />
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="grey" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" form="product-form" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
