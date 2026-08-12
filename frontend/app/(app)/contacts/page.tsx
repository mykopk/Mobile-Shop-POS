"use client";

import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/apiClient";
import type { Contact } from "@/lib/api-types";
import { useApi } from "@/lib/use-api";
import { formatPKR } from "@/lib/money";
import { parseCsvLine, downloadCsv } from "@/lib/csv";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BadgeVariant } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dropdown } from "@/components/ui/dropdown";
import { Dialog } from "@/components/ui/dialog";
import { Sheet } from "@/components/ui/sheet";
import { SearchInput } from "@/components/ui/search-input";
import { CsvImportSheet } from "@/components/ui/csv-import-sheet";
import { SortHeader } from "@/components/ui/sort-header";
import { PaginationBar, usePagination } from "@/components/ui/pagination";
import { useToast } from "@/components/ui/toast";
import { ContactForm, EMPTY_CONTACT_FORM, type ContactFormValues } from "@/components/contacts/contact-form";
import { DownloadIcon, FilterIcon, PlusIcon, TrashIcon, UploadIcon } from "@/components/icons";

type SortKey = "name" | "type" | "phone" | "creditLimit" | "creditBalance" | "transactionCount";

const TYPE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All types" },
  { value: "CUSTOMER", label: "Customer" },
  { value: "VENDOR", label: "Vendor" },
  { value: "WALK_IN", label: "Walk-in" },
  { value: "BOTH", label: "Customer & vendor" },
];

const TYPE_VARIANT: Record<string, BadgeVariant> = {
  CUSTOMER: "brand",
  VENDOR: "violet",
  WALK_IN: "neutral",
  BOTH: "blue",
};

export default function ContactsPage() {
  const { data, loading, refetch } = useApi<Contact[]>("/contact");
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "name", dir: "asc" });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const filtered = useMemo(() => {
    const list = data ?? [];
    return list.filter((c) => {
      if (type && c.type !== type) return false;
      const query = q.trim().toLowerCase();
      if (!query) return true;
      return [c.name, c.phone ?? "", c.email ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [data, q, type]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    const dir = sort.dir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      let va: string | number = "";
      let vb: string | number = "";
      switch (sort.key) {
        case "name":
          va = a.name.toLowerCase();
          vb = b.name.toLowerCase();
          break;
        case "type":
          va = a.type;
          vb = b.type;
          break;
        case "phone":
          va = a.phone ?? "";
          vb = b.phone ?? "";
          break;
        case "creditLimit":
          va = parseFloat(a.creditLimit) || 0;
          vb = parseFloat(b.creditLimit) || 0;
          break;
        case "creditBalance":
          va = parseFloat(a.creditBalance) || 0;
          vb = parseFloat(b.creditBalance) || 0;
          break;
        case "transactionCount":
          va = a.transactionCount;
          vb = b.transactionCount;
          break;
      }
      if (va < vb) return -dir;
      if (va > vb) return dir;
      return 0;
    });
    return list;
  }, [filtered, sort]);

  const { page: safePage, pageSize, setPage, setPageSize, pageCount, from, to, slice } = usePagination(sorted.length);
  const pageItems = slice(sorted);

  useEffect(() => {
    setPage(1);
  }, [q, type, pageSize]);

  function onSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (filtered.length === 0) return;
    setSelected((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((c) => c.id)),
    );
  }

  function openCreate() {
    setEditingId(null);
    setFormKey((k) => k + 1);
    setOpen(true);
  }

  function openEdit(c: Contact) {
    setEditingId(c.id);
    setFormKey((k) => k + 1);
    setOpen(true);
  }

  function initialForm(): ContactFormValues {
    if (!editingId) return { ...EMPTY_CONTACT_FORM };
    const c = (data ?? []).find((x) => x.id === editingId);
    if (!c) return { ...EMPTY_CONTACT_FORM };
    return {
      type: c.type as ContactFormValues["type"],
      name: c.name,
      phone: c.phone ?? "",
      email: c.email ?? "",
      address: c.address ?? "",
      notes: c.notes ?? "",
      creditLimit: c.creditLimit || "",
    };
  }

  async function save(values: ContactFormValues) {
    if (!values.name.trim()) {
      toast("Name is required", "error");
      return;
    }
    setSaving(true);
    try {
      const body = {
        type: values.type,
        name: values.name.trim(),
        phone: values.phone.trim() || undefined,
        email: values.email.trim() || undefined,
        address: values.address.trim() || undefined,
        notes: values.notes.trim() || undefined,
        creditLimit: parseFloat(values.creditLimit) || 0,
      };
      if (editingId) {
        await apiRequest(`/contact/${editingId}`, { method: "PUT", body });
        toast("Contact updated", "success");
      } else {
        await apiRequest("/contact", { method: "POST", body });
        toast("Contact created", "success");
      }
      setOpen(false);
      refetch();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save contact", "error");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteSelected() {
    if (selected.size === 0) return;
    setDeleting(true);
    setConfirmDelete(false);
    try {
      const result = await apiRequest<{ deleted: number; blocked: { id: string; name: string }[] }>(
        "/contact",
        { method: "DELETE", body: { ids: [...selected] } },
      );
      setSelected(new Set());
      refetch();
      if (result.blocked.length > 0) {
        toast(
          `${result.deleted} deleted. ${result.blocked.length} skipped (have transactions): ${result.blocked
            .slice(0, 3)
            .map((b) => b.name)
            .join(", ")}${result.blocked.length > 3 ? "…" : ""}`,
          "error",
        );
      } else {
        toast(`${result.deleted} contact(s) deleted`, "success");
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete", "error");
    } finally {
      setDeleting(false);
    }
  }

  function exportCsv() {
    const headers = ["Name", "Type", "Phone", "Email", "Address", "Notes", "Credit limit"];
    const rows = filtered.map((c) => [
      c.name,
      c.type,
      c.phone ?? "",
      c.email ?? "",
      c.address ?? "",
      c.notes ?? "",
      c.creditLimit || "",
    ]);
    downloadCsv("contacts.csv", headers, rows);
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseContactsCsv(text);
      if (rows.length === 0) {
        toast("No rows found in file", "error");
        return;
      }
      const result = await apiRequest<{
        created: { name: string; phone: string | null }[];
        skipped: { name: string; reason: string }[];
      }>("/contact/import", { method: "POST", body: { contacts: rows } });
      const skippedSummary =
        result.skipped.length > 0
          ? `, ${result.skipped.length} skipped (${result.skipped[0].reason}${result.skipped.length > 1 ? "…" : ""})`
          : "";
      toast(`Imported ${result.created.length} contact(s)${skippedSummary}`, result.skipped.length > 0 ? "error" : "success");
      refetch();
      setImportOpen(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to import", "error");
    } finally {
      setImporting(false);
    }
  }

  const selectedCount = filtered.filter((c) => selected.has(c.id)).length;
  const allSelected = filtered.length > 0 && selectedCount === filtered.length;
  const someSelected = selectedCount > 0 && selectedCount < filtered.length;

  const activeFilterCount = type ? 1 : 0;

  function resetFilters() {
    setType("");
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex shrink-0 items-center justify-between gap-3">
        {selected.size > 0 ? (
          <p className="text-sm text-ink-500">
            <span className="font-semibold text-ink-900">{selected.size} selected</span>
          </p>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="grey" onClick={() => setImportOpen(true)}>
            <UploadIcon className="h-4 w-4" />
            Import
          </Button>
          <Button variant="grey" onClick={exportCsv}>
            <DownloadIcon className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="destructive"
            onClick={() => setConfirmDelete(true)}
            disabled={deleting || selected.size === 0}
          >
            <TrashIcon className="h-4 w-4" />
            {deleting ? "Deleting…" : "Delete selected"}
          </Button>
          <Button onClick={openCreate}>
            <PlusIcon className="h-4 w-4" />
            New contact
          </Button>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Search by name, phone or email…"
          variant="white"
          wrapperClassName="min-w-[220px] flex-1"
        />
        <Button variant="grey" onClick={() => setFiltersOpen(true)}>
          <FilterIcon className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="brandSolid">{activeFilterCount}</Badge>
          )}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-none rounded-2xl bg-white">
        {loading ? (
          <p className="p-6 text-sm text-ink-400">Loading…</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-xs uppercase tracking-wide text-ink-500">
                <th className="w-10 px-4 py-3">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onChange={toggleAll}
                  />
                </th>
                <SortHeader label="Name" k="name" sort={sort} onSort={onSort} />
                <SortHeader label="Type" k="type" sort={sort} onSort={onSort} />
                <SortHeader label="Phone" k="phone" sort={sort} onSort={onSort} />
                <SortHeader label="Credit limit" k="creditLimit" sort={sort} onSort={onSort} right />
                <SortHeader label="Credit" k="creditBalance" sort={sort} onSort={onSort} right />
                <SortHeader label="Transactions" k="transactionCount" sort={sort} onSort={onSort} right />
              </tr>
            </thead>
            <tbody>
              {pageItems.map((c) => {
                const isSelected = selected.has(c.id);
                return (
                  <tr
                    key={c.id}
                    onClick={() => openEdit(c)}
                    className={`cursor-pointer transition ${
                      isSelected ? "bg-brand-50/40" : "hover:bg-ink-50"
                    }`}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onChange={() => toggle(c.id)}
                      />
                    </td>
                    <td className="px-5 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink-900">{c.name}</p>
                        {c.email && <p className="truncate text-xs text-ink-500">{c.email}</p>}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={TYPE_VARIANT[c.type] ?? "neutral"}>
                        {c.type.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-ink-700">{c.phone ?? "—"}</td>
                    <td className="px-5 py-3 text-right text-ink-500">
                      {c.creditLimit ? formatPKR(c.creditLimit) : "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-ink-900">
                      {parseFloat(c.creditBalance) < 0 ? (
                        <span className="text-amber-600">
                          owe {formatPKR(Math.abs(parseFloat(c.creditBalance)))}
                        </span>
                      ) : (
                        formatPKR(c.creditBalance)
                      )}
                    </td>
                    <td className="px-5 py-3 text-right text-ink-500">{c.transactionCount}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-ink-400">
                    No contacts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <PaginationBar
        from={from}
        to={to}
        total={sorted.length}
        page={safePage}
        pageCount={pageCount}
        pageSize={pageSize}
        onPrev={() => setPage(safePage - 1)}
        onNext={() => setPage(safePage + 1)}
        onPageSize={setPageSize}
      />

      <Dialog
        open={confirmDelete}
        title="Delete contacts?"
        message={`This will permanently delete ${selected.size} contact(s) with no transactions.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        busy={deleting}
        onConfirm={confirmDeleteSelected}
        onCancel={() => setConfirmDelete(false)}
      />

      <Sheet
        open={open}
        title={editingId ? "Edit contact" : "Add contact"}
        onClose={() => setOpen(false)}
        width="max-w-xl"
      >
        <ContactForm
          key={formKey}
          initial={initialForm()}
          saving={saving}
          onSave={save}
          onCancel={() => setOpen(false)}
        />
      </Sheet>

      <Sheet
        open={filtersOpen}
        title="Filters"
        onClose={() => setFiltersOpen(false)}
        width="max-w-md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500">Type</label>
            <Dropdown
              value={type}
              onChange={setType}
              options={TYPE_FILTER_OPTIONS}
              placeholder="All types"
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-ink-500">{filtered.length} contact(s)</p>
            <div className="flex items-center gap-2">
              <Button variant="grey" onClick={resetFilters}>
                Reset
              </Button>
              <Button onClick={() => setFiltersOpen(false)}>Show results</Button>
            </div>
          </div>
        </div>
      </Sheet>

      <CsvImportSheet
        open={importOpen}
        title="Import contacts from CSV"
        description={
          <>
            Upload a CSV with columns:{" "}
            <span className="font-semibold text-ink-700">Name, Type, Phone, Email, Address, Notes, Credit limit</span>.
            Name is required. Type can be{" "}
            <span className="font-semibold text-ink-700">Customer, Vendor, Walk-in or Customer &amp; vendor</span>;
            existing contacts (same phone or name) are skipped.
          </>
        }
        importing={importing}
        onFile={(file) => void handleImportFile(file)}
        onClose={() => setImportOpen(false)}
      />
    </div>
  );
}

function parseContactsCsv(text: string) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, ""));
  const idx = (name: string) => headers.indexOf(name);
  const rows: {
    type: "CUSTOMER" | "VENDOR" | "WALK_IN" | "BOTH";
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
    creditLimit: number;
  }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cells = parseCsvLine(line);
    const at = (name: string) => {
      const j = idx(name);
      return j >= 0 && j < cells.length ? cells[j] : "";
    };
    const name = at("name");
    if (!name) continue;
    const rawType = at("type").trim().toLowerCase();
    const type = rawType.startsWith("vend")
      ? "VENDOR"
      : rawType.includes("walk")
        ? "WALK_IN"
        : rawType.includes("both") || rawType.includes("&")
          ? "BOTH"
          : "CUSTOMER";
    rows.push({
      type,
      name,
      phone: at("phone") || undefined,
      email: at("email") || undefined,
      address: at("address") || undefined,
      notes: at("notes") || undefined,
      creditLimit: parseFloat(at("creditlimit")) || 0,
    });
  }
  return rows;
}
