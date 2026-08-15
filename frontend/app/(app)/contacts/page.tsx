"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/apiClient";
import type { Contact } from "@/lib/api-types";
import { useApi } from "@/lib/use-api";
import { formatPKR } from "@/lib/money";
import { parseCsvLine, downloadCsv } from "@/lib/csv";
import { ledgerHref } from "@/lib/ledger";
import { contactInitials, creditRemaining, creditUsed } from "@/lib/contacts";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dropdown } from "@/components/ui/dropdown";
import { Dialog } from "@/components/ui/dialog";
import { Sheet } from "@/components/ui/sheet";
import { SearchInput } from "@/components/ui/search-input";
import { CsvImportSheet } from "@/components/ui/csv-import-sheet";
import { useToast } from "@/components/ui/toast";
import { SortHeader } from "@/components/ui/sort-header";
import { PaginationBar, usePagination } from "@/components/ui/pagination";
import { ContextMenu } from "@/components/ui/context-menu";
import { ContactTypePill } from "@/components/ui/type-pill";
import { ContactForm, EMPTY_CONTACT_FORM, type ContactFormValues } from "@/components/contacts/contact-form";
import { CityManageWindow } from "@/components/contacts/city-manage-window";
import { ContactProfile } from "@/components/contacts/contact-profile";
import { CameraIcon, DownloadIcon, EyeIcon, FilterIcon, PlusIcon, PrinterIcon, SettingsIcon, TrashIcon, UploadIcon } from "@/components/icons";

type SortKey = "name" | "type" | "phone" | "creditLimit" | "receivable" | "payable" | "transactionCount";

const TYPE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All types" },
  { value: "CUSTOMER", label: "Customer" },
  { value: "VENDOR", label: "Vendor" },
  { value: "WALK_IN", label: "Walk-in" },
  { value: "BOTH", label: "Customer & vendor" },
];

export default function ContactsPage() {
  const router = useRouter();
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
  const [confirmDeleteOne, setConfirmDeleteOne] = useState<Contact | null>(null);
  const [deletingOne, setDeletingOne] = useState(false);
  const [documentsContact, setDocumentsContact] = useState<Contact | null>(null);
  const [manageCitiesOpen, setManageCitiesOpen] = useState(false);
  const [profileContact, setProfileContact] = useState<Contact | null>(null);

  const filtered = useMemo(() => {
    const list = data ?? [];
    return list.filter((c) => {
      if (type && c.type !== type) return false;
      const query = q.trim().toLowerCase();
      if (!query) return true;
      return [c.name, c.phone ?? "", c.email ?? "", c.city ?? "", c.cnic ?? "", c.notes ?? ""]
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
        case "receivable":
          va = parseFloat(a.receivable) || 0;
          vb = parseFloat(b.receivable) || 0;
          break;
        case "payable":
          va = parseFloat(a.payable) || 0;
          vb = parseFloat(b.payable) || 0;
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
      city: c.city ?? "",
      cnic: c.cnic ?? "",
      photoUrl: c.photoUrl,
      cnicFrontUrl: c.cnicFrontUrl,
      cnicBackUrl: c.cnicBackUrl,
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
        city: values.city.trim() || undefined,
        cnic: values.cnic.trim() || undefined,
        photoUrl: values.photoUrl || undefined,
        cnicFrontUrl: values.cnicFrontUrl || undefined,
        cnicBackUrl: values.cnicBackUrl || undefined,
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

  async function deleteOneContact() {
    if (!confirmDeleteOne) return;
    const target = confirmDeleteOne;
    setDeletingOne(true);
    try {
      const result = await apiRequest<{ deleted: number; blocked: { id: string; name: string }[] }>(
        "/contact",
        { method: "DELETE", body: { ids: [target.id] } },
      );
      setConfirmDeleteOne(null);
      refetch();
      if (result.blocked.length > 0) {
        toast("Can't delete — this contact has transactions", "error");
      } else {
        toast("Contact deleted", "success");
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete contact", "error");
    } finally {
      setDeletingOne(false);
    }
  }

  function exportCsv() {
    const headers = ["Name", "Type", "Phone", "Email", "Address", "City", "CNIC", "Notes", "Credit limit"];
    const rows = filtered.map((c) => [
      c.name,
      c.type,
      c.phone ?? "",
      c.email ?? "",
      c.address ?? "",
      c.city ?? "",
      c.cnic ?? "",
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
          <Link href="/print?type=contacts">
            <Button variant="grey">
              <PrinterIcon className="h-4 w-4" />
              Print
            </Button>
          </Link>
          <Button variant="grey" onClick={() => setManageCitiesOpen(true)}>
            <SettingsIcon className="h-4 w-4" />
            Manage
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
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold leading-none text-white">
              {activeFilterCount}
            </span>
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
                <th className="px-5 py-3">CNIC</th>
                <SortHeader label="Credit limit" k="creditLimit" sort={sort} onSort={onSort} right />
                <SortHeader label="Debit" k="receivable" sort={sort} onSort={onSort} right />
                <SortHeader label="Credit" k="payable" sort={sort} onSort={onSort} right />
                <SortHeader label="Transactions" k="transactionCount" sort={sort} onSort={onSort} right />
                <th className="px-5 py-3">Notes</th>
                <th className="w-12 px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {pageItems.map((c) => {
                const isSelected = selected.has(c.id);
                const used = creditUsed(c);
                const remaining = creditRemaining(c);
                const limit = parseFloat(c.creditLimit) || 0;
                const usedPct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
                return (
                  <tr
                    key={c.id}
                    onClick={() => setProfileContact(c)}
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
                      <div className="flex min-w-0 items-center gap-3">
                        {c.photoUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={c.photoUrl}
                            alt={c.name}
                            className="h-9 w-9 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-bold text-ink-600">
                            {contactInitials(c.name)}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink-900">{c.name}</p>
                          <p className="truncate text-xs text-ink-500">
                            {c.phone ? (
                              c.phone
                            ) : c.email ? (
                              c.email
                            ) : (
                              "—"
                            )}
                            {c.phone && c.email ? ` · ${c.email}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <ContactTypePill type={c.type} />
                    </td>
                    <td className="px-5 py-3 text-ink-700">
                      {c.cnic ? (
                        <span className="text-xs">{c.cnic}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {limit > 0 ? (
                        <div className="ml-auto w-28">
                          <p className="text-xs">
                            <span className={`font-semibold ${used > limit ? "text-error" : "text-ink-900"}`}>
                              {formatPKR(used)}
                            </span>
                            <span className="text-ink-400"> / {formatPKR(limit)}</span>
                          </p>
                          <div className="mt-1 h-1 overflow-hidden rounded-full bg-ink-100">
                            <div
                              className={`h-full rounded-full ${used > limit ? "bg-error" : "bg-brand-600"}`}
                              style={{ width: `${usedPct}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-ink-300">—</span>
                      )}
                      {remaining > 0 && (
                        <p className="mt-0.5 text-[11px] text-ink-400">{formatPKR(remaining)} left</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-medium">
                      {parseFloat(c.receivable) > 0 ? (
                        <span className="text-brand-600">{formatPKR(c.receivable)}</span>
                      ) : (
                        <span className="text-ink-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-medium">
                      {parseFloat(c.payable) > 0 ? (
                        <span className="text-ink-900">{formatPKR(c.payable)}</span>
                      ) : (
                        <span className="text-ink-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right text-ink-500">{c.transactionCount}</td>
                    <td className="max-w-40 px-5 py-3">
                      {c.notes ? (
                        <p className="truncate text-xs text-ink-500" title={c.notes}>
                          {c.notes}
                        </p>
                      ) : (
                        <span className="text-ink-300">—</span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <ContextMenu
                        items={[
                          { label: "View ledger", leading: <EyeIcon className="h-4 w-4" />, onClick: () => router.push(ledgerHref(c.id)) },
                          { label: "View documents", leading: <CameraIcon className="h-4 w-4" />, onClick: () => setDocumentsContact(c) },
                          { label: "Edit", onClick: () => openEdit(c) },
                          { label: "Delete", leading: <TrashIcon className="h-4 w-4" />, danger: true, onClick: () => setConfirmDeleteOne(c) },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={10} className="px-5 py-8 text-center text-sm text-ink-400">
                    No contacts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <PaginationBar
        className="mt-3"
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
          excludeId={editingId ?? undefined}
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
            <span className="font-semibold text-ink-700">
              Name, Type, Phone, Email, Address, City, CNIC, Notes, Credit limit
            </span>
            . Name is required. Type can be{" "}
            <span className="font-semibold text-ink-700">Customer, Vendor, Walk-in or Customer &amp; vendor</span>;
            existing contacts (same phone or name) are skipped.
          </>
        }
        importing={importing}
        onFile={(file) => void handleImportFile(file)}
        onClose={() => setImportOpen(false)}
      />

      <CityManageWindow
        open={manageCitiesOpen}
        onClose={() => setManageCitiesOpen(false)}
      />

      <Dialog
        open={!!confirmDeleteOne}
        title="Delete contact?"
        message={
          confirmDeleteOne ? (
            <span>
              This permanently deletes{" "}
              <span className="font-semibold text-ink-900">{confirmDeleteOne.name}</span> if it has no transactions.
            </span>
          ) : null
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        busy={deletingOne}
        onConfirm={() => void deleteOneContact()}
        onCancel={() => setConfirmDeleteOne(null)}
      />

      <Sheet
        open={!!documentsContact}
        title={documentsContact ? `${documentsContact.name} — documents` : ""}
        onClose={() => setDocumentsContact(null)}
        width="max-w-lg"
      >
        {documentsContact && (
          <div className="space-y-4">
            {!documentsContact.photoUrl &&
              !documentsContact.cnicFrontUrl &&
              !documentsContact.cnicBackUrl && (
                <p className="text-sm text-ink-400">No documents saved for this contact yet.</p>
              )}
            {documentsContact.photoUrl && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">Photo</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={documentsContact.photoUrl}
                  alt="Contact photo"
                  className="mx-auto max-h-80 rounded-2xl object-contain"
                />
              </div>
            )}
            {(documentsContact.cnicFrontUrl || documentsContact.cnicBackUrl) && (
              <div className="grid grid-cols-1 gap-4">
                {documentsContact.cnicFrontUrl && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
                      CNIC front
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={documentsContact.cnicFrontUrl}
                      alt="CNIC front"
                      className="mx-auto max-h-80 rounded-2xl object-contain"
                    />
                  </div>
                )}
                {documentsContact.cnicBackUrl && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
                      CNIC back
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={documentsContact.cnicBackUrl}
                      alt="CNIC back"
                      className="mx-auto max-h-80 rounded-2xl object-contain"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Sheet>

      <ContactProfile contact={profileContact} onClose={() => setProfileContact(null)} />
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
    city?: string;
    cnic?: string;
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
      city: at("city") || undefined,
      cnic: at("cnic") || undefined,
      notes: at("notes") || undefined,
      creditLimit: parseFloat(at("creditlimit")) || 0,
    });
  }
  return rows;
}
