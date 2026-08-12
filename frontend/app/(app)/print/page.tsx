"use client";

import { Fragment, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { apiRequest } from "@/lib/apiClient";
import { useAuth } from "@/lib/auth-context";
import type { CompanyProfile, Transaction, TransactionDetail, Unit, Voucher } from "@/lib/api-types";
import { formatPKR } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { whatsappLink } from "@/lib/whatsapp";
import { canViewCosts } from "@/lib/roles";
import { CARRIER_LABELS } from "@/lib/constants/units";
import {
  APP,
  INVENTORY_DEFAULT_OPTIONS,
  INVENTORY_FORMAT_IDS,
  INVENTORY_OPTION_LABELS,
  INVENTORY_TEXT,
  PRINT,
  PRINT_DEFAULT_OPTIONS,
  PRINT_FORMATS,
  PRINT_OPTION_LABELS,
  QR_TARGETS,
  RECEIPT_TEXT,
  VOUCHER_METHOD_LABELS,
  VOUCHER_TYPE_LABELS,
  type InventoryPrintOptionKey,
  type InventoryPrintOptions,
  type PrintBooleanOptions,
  type PrintFormatId,
  type PrintLayoutType,
  type QrTarget,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dropdown } from "@/components/ui/dropdown";
import { useToast } from "@/components/ui/toast";
import { InventoryIcon, PrinterIcon, TrashIcon, XIcon } from "@/components/icons";

type DocType = "SALE" | "PURCHASE" | "SALE_RETURN" | "PURCHASE_RETURN" | "VOUCHER";

const DOC_TYPES: { value: DocType; label: string; hint: string }[] = [
  { value: "SALE", label: "Sale", hint: "Customer sale receipt" },
  { value: "PURCHASE", label: "Purchase", hint: "Supplier purchase invoice" },
  { value: "SALE_RETURN", label: "Sale return", hint: "Return from a customer" },
  { value: "PURCHASE_RETURN", label: "Purchase return", hint: "Return to a supplier" },
  { value: "VOUCHER", label: "Voucher", hint: "Cash receiving / payment voucher" },
];

const TYPE_TITLE: Record<string, string> = {
  ...RECEIPT_TEXT.document,
};

const TYPE_DOT: Record<string, string> = {
  SALE: "bg-brand-500",
  PURCHASE: "bg-ink-300",
  SALE_RETURN: "bg-brand-300",
  PURCHASE_RETURN: "bg-ink-500",
  VOUCHER: "bg-brand-600",
};

const STATUS_LABEL: Record<string, string> = {
  IN_STOCK: "In stock",
  RESERVED: "Reserved",
  SOLD: "Sold",
  RETURNED: "Returned",
  DAMAGED: "Damaged",
  WRITTEN_OFF: "Written off",
};

type BankAccount = {
  id: string;
  name: string;
  bankName: string;
  accountNo: string;
  holderName: string | null;
  iban: string | null;
  isDefault: boolean;
  active: boolean;
};

type PrintLayout = {
  id: string;
  name: string;
  type: PrintLayoutType;
  format: PrintFormatId;
  options: Record<string, boolean> | null;
  qrType: string;
  isDefault: boolean;
};

function loadOptions(): PrintBooleanOptions {
  try {
    const raw = localStorage.getItem(PRINT.storageKey);
    if (raw) return { ...PRINT_DEFAULT_OPTIONS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...PRINT_DEFAULT_OPTIONS };
}

function loadFormat(): PrintFormatId {
  try {
    const f = localStorage.getItem(PRINT.formatKey) as PrintFormatId | null;
    if (f && PRINT_FORMATS.some((x) => x.id === f)) return f;
  } catch {
    /* ignore */
  }
  return "80";
}

function loadQrType(): QrTarget {
  try {
    const t = localStorage.getItem(PRINT.qrTypeKey) as QrTarget | null;
    if (t && QR_TARGETS.some((x) => x.id === t)) return t;
  } catch {
    /* ignore */
  }
  return "none";
}

function loadInvOptions(): InventoryPrintOptions {
  try {
    const raw = localStorage.getItem(PRINT.invOptionsKey);
    if (raw) return { ...INVENTORY_DEFAULT_OPTIONS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...INVENTORY_DEFAULT_OPTIONS };
}

function PrintStudioContent() {
  const params = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const deepLinkId = params.get("id");
  const deepLinkType = params.get("type");
  const isTxnDeepLink = DOC_TYPES.some((t) => t.value === deepLinkType);
  const [format, setFormat] = useState<PrintFormatId>("80");
  const [options, setOptions] = useState<PrintBooleanOptions>({ ...PRINT_DEFAULT_OPTIONS });
  const [invOptions, setInvOptions] = useState<InventoryPrintOptions>({ ...INVENTORY_DEFAULT_OPTIONS });
  const [qrType, setQrType] = useState<QrTarget>("none");
  const [layoutType, setLayoutType] = useState<PrintLayoutType>(
    deepLinkType === "inventory" ? "inventory" : "document",
  );
  const [typePickerOpen, setTypePickerOpen] = useState(!deepLinkType);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [layouts, setLayouts] = useState<PrintLayout[]>([]);
  const [activeLayoutId, setActiveLayoutId] = useState<string | null>(null);
  const [layoutName, setLayoutName] = useState("");
  const [savingLayout, setSavingLayout] = useState(false);
  const [documents, setDocuments] = useState<Transaction[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [docType, setDocType] = useState<DocType>(isTxnDeepLink ? (deepLinkType as DocType) : "SALE");
  const [selectedId, setSelectedId] = useState<string | null>(deepLinkId);
  const [detail, setDetail] = useState<TransactionDetail | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [modal, setModal] = useState<"format" | "content" | "save" | null>(null);
  const applyingLayoutRef = useRef(false);

  const activeFormat: PrintFormatId = layoutType === "inventory" && format === "58" ? "80" : format;
  const fmt = PRINT_FORMATS.find((f) => f.id === activeFormat) ?? PRINT_FORMATS[1];
  const availableFormats =
    layoutType === "inventory" ? PRINT_FORMATS.filter((f) => INVENTORY_FORMAT_IDS.includes(f.id)) : PRINT_FORMATS;
  const selectedDoc = documents.find((d) => d.id === selectedId) ?? null;
  const selectedVoucher = vouchers.find((v) => v.id === selectedId) ?? null;
  const activeLayout = layouts.find((l) => l.id === activeLayoutId) ?? null;
  const showCost = canViewCosts(user) && invOptions.cost;
  const inStockCount = units.filter((u) => u.status === "IN_STOCK").length;

  const docOptions =
    docType === "VOUCHER"
      ? vouchers.map((v) => ({
          value: v.id,
          label: `${v.number} · ${v.contact?.name ?? "Walk-in"}`,
          leading: <span className={`h-2 w-2 shrink-0 rounded-full ${TYPE_DOT[v.type] ?? "bg-ink-200"}`} />,
          trailing: <span className="text-xs text-ink-400">{new Date(v.date).toLocaleDateString()}</span>,
        }))
      : documents
          .filter((d) => d.type === docType)
          .map((d) => ({
            value: d.id,
            label: `${d.number} · ${d.contact.name}`,
            leading: <span className={`h-2 w-2 shrink-0 rounded-full ${TYPE_DOT[d.type] ?? "bg-ink-200"}`} />,
            trailing: <span className="text-xs text-ink-400">{new Date(d.createdAt).toLocaleDateString()}</span>,
          }));

  const layoutOptions = [
    ...layouts
      .filter((l) => l.type === layoutType)
      .map((l) => ({
        value: l.id,
        label: l.name,
        trailing: l.isDefault ? (
          <span className="rounded bg-brand-600 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white">Default</span>
        ) : undefined,
      })),
    { value: "__save", label: "Save current as…" },
  ];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await apiRequest<PrintLayout[]>("/print-layout");
        if (cancelled) return;
        setLayouts(list ?? []);
        const def = (list ?? []).find((l) => l.isDefault);
        if (def) {
          applyLayout(def);
        } else {
          setFormat(loadFormat());
          setOptions(loadOptions());
          setInvOptions(loadInvOptions());
          setQrType(loadQrType());
        }
      } catch {
        setFormat(loadFormat());
        setOptions(loadOptions());
        setInvOptions(loadInvOptions());
        setQrType(loadQrType());
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyLayout(layout: PrintLayout) {
    applyingLayoutRef.current = true;
    setActiveLayoutId(layout.id);
    setLayoutType(layout.type);
    setFormat(layout.format);
    if (layout.type === "inventory") {
      setInvOptions({ ...INVENTORY_DEFAULT_OPTIONS, ...(layout.options ?? {}) } as InventoryPrintOptions);
    } else {
      setOptions({ ...PRINT_DEFAULT_OPTIONS, ...(layout.options ?? {}) } as PrintBooleanOptions);
    }
    setQrType(layout.qrType === "website" ? "none" : (layout.qrType as QrTarget));
  }

  useEffect(() => {
    if (applyingLayoutRef.current) {
      applyingLayoutRef.current = false;
      return;
    }
    setActiveLayoutId(null);
  }, [format, options, invOptions, qrType, layoutType]);

  useEffect(() => {
    try {
      localStorage.setItem(PRINT.storageKey, JSON.stringify(options));
    } catch {
      /* ignore */
    }
  }, [options]);

  useEffect(() => {
    try {
      localStorage.setItem(PRINT.invOptionsKey, JSON.stringify(invOptions));
    } catch {
      /* ignore */
    }
  }, [invOptions]);

  useEffect(() => {
    try {
      localStorage.setItem(PRINT.formatKey, format);
    } catch {
      /* ignore */
    }
  }, [format]);

  useEffect(() => {
    try {
      localStorage.setItem(PRINT.qrTypeKey, qrType);
    } catch {
      /* ignore */
    }
  }, [qrType]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await apiRequest<CompanyProfile>("/settings/company");
        if (!cancelled) setProfile(p);
      } catch {
        /* optional — QR targets simply stay unset */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await apiRequest<BankAccount[]>("/bank-account");
        if (!cancelled) setBankAccounts((list ?? []).filter((a) => a.active));
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadDocuments = useMemo(
    () => async () => {
      try {
        const list = await apiRequest<Transaction[]>("/transaction?limit=100");
        setDocuments(list ?? []);
      } catch (err) {
        toast(err instanceof Error ? err.message : "Failed to load documents", "error");
      }
    },
    [toast],
  );

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const loadVouchers = useMemo(
    () => async () => {
      setLoadingVouchers(true);
      try {
        const list = await apiRequest<Voucher[]>("/voucher");
        setVouchers(list ?? []);
      } catch (err) {
        toast(err instanceof Error ? err.message : "Failed to load vouchers", "error");
      } finally {
        setLoadingVouchers(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    if (docType !== "VOUCHER") return;
    void loadVouchers();
  }, [docType, loadVouchers]);

  useEffect(() => {
    if (layoutType !== "inventory") return;
    let cancelled = false;
    (async () => {
      setLoadingUnits(true);
      try {
        const list = await apiRequest<Unit[]>("/unit");
        if (!cancelled) setUnits(list ?? []);
      } catch (err) {
        if (!cancelled) toast(err instanceof Error ? err.message : "Failed to load inventory", "error");
      } finally {
        if (!cancelled) setLoadingUnits(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [layoutType, toast]);

  useEffect(() => {
    if (!selectedId || docType === "VOUCHER") {
      setDetail(null);
      setQrUrl(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingDoc(true);
      try {
        const d = await apiRequest<TransactionDetail>(`/transaction/${selectedId}`);
        if (!cancelled) setDetail(d);
      } catch (err) {
        if (!cancelled) toast(err instanceof Error ? err.message : "Failed to load document", "error");
      } finally {
        if (!cancelled) setLoadingDoc(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, docType, toast]);

  const qrPayload = useMemo(() => {
    if (qrType === "none") return null;
    const wa = profile?.whatsapp?.trim();
    return wa ? whatsappLink(wa) : null;
  }, [qrType, profile]);

  useEffect(() => {
    if (!qrPayload) {
      setQrUrl(null);
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(qrPayload, { width: 160, margin: 1 }).then((url) => {
      if (!cancelled) setQrUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [qrPayload]);

  const printCss = useMemo(
    () => `
      #print-portal { display: none; }
      @page { size: ${fmt.pageSize}; margin: ${fmt.pageMargin}; }
      @media print {
        body { background: #fff !important; }
        body > *:not(#print-portal) { display: none !important; }
        #print-portal { display: block !important; }
        #print-portal .print-doc { width: ${fmt.printWidthMm}mm; }
        #print-portal table tr, #print-portal .avoid-break { break-inside: avoid; }
      }
    `,
    [fmt],
  );

  function toggle(key: keyof PrintBooleanOptions) {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function invToggle(key: InventoryPrintOptionKey) {
    setInvOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const qrMissingHint = {
    none: "",
    whatsapp: "Set your WhatsApp number in Settings → QR code targets to show this QR",
  }[qrType];

  async function saveLayout() {
    if (!layoutName.trim()) {
      toast("Enter a name for the layout", "error");
      return;
    }
    setSavingLayout(true);
    try {
      const created = await apiRequest<PrintLayout>("/print-layout", {
        method: "POST",
        body:
          layoutType === "inventory"
            ? { name: layoutName.trim(), type: layoutType, format: activeFormat, options: invOptions }
            : { name: layoutName.trim(), type: layoutType, format, options, qrType },
      });
      setLayouts((prev) => [...prev, created]);
      setActiveLayoutId(created.id);
      setLayoutName("");
      setModal(null);
      toast("Layout saved", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save layout", "error");
    } finally {
      setSavingLayout(false);
    }
  }

  async function setDefaultLayout(id: string) {
    try {
      const updated = await apiRequest<PrintLayout>(`/print-layout/${id}/default`, {
        method: "POST",
      });
      setLayouts((prev) => prev.map((l) => (l.id === id ? updated : { ...l, isDefault: false })));
      toast("Default layout set", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to set default", "error");
    }
  }

  async function removeLayout(id: string) {
    try {
      await apiRequest(`/print-layout/${id}`, { method: "DELETE" });
      setLayouts((prev) => prev.filter((l) => l.id !== id));
      if (activeLayoutId === id) setActiveLayoutId(null);
      toast("Layout deleted", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete layout", "error");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setTypePickerOpen(true)}
          className="flex items-center gap-1.5 rounded-2xl bg-white px-3.5 py-2 text-sm font-semibold text-ink-900 shadow-sm transition hover:bg-ink-50"
        >
          {layoutType === "inventory" ? (
            <>
              <InventoryIcon className="h-4 w-4 text-ink-400" />
              Inventory list
            </>
          ) : (
            <>
              <span className={`h-2 w-2 rounded-full ${TYPE_DOT[docType]}`} />
              {DOC_TYPES.find((t) => t.value === docType)?.label}
            </>
          )}
          <span className="text-xs font-medium text-ink-400">Change</span>
        </button>
        {layoutType === "document" ? (
          <div className="min-w-56 max-w-xs flex-1">
            <Dropdown
              value={selectedId}
              options={docOptions}
              onChange={(id) => {
                setSelectedId(id);
                setDetail(null);
              }}
              searchable
              trigger={
                <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-2 text-sm shadow-sm">
                  <span className="truncate text-ink-900">
                    {docType === "VOUCHER"
                      ? selectedVoucher
                        ? `${selectedVoucher.number} · ${selectedVoucher.contact?.name ?? "Walk-in"}`
                        : "Select voucher…"
                      : selectedDoc
                        ? `${selectedDoc.number} · ${selectedDoc.contact.name}`
                        : "Select document…"}
                  </span>
                </div>
              }
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm shadow-sm">
            <InventoryIcon className="h-4 w-4 text-ink-400" />
            <span className="text-ink-900">
              <span className="font-semibold">{units.length}</span> unit(s)
            </span>
            <span className="text-ink-500">·</span>
            <span className="text-ink-500">
              <span className="font-semibold text-emerald-700">{inStockCount}</span> in stock
            </span>
          </div>
        )}
        <Button
          variant="secondary"
          className="rounded-xl px-4 py-2 text-xs"
          onClick={() => setModal("format")}
        >
          {fmt.label}
        </Button>
        <Button
          variant="secondary"
          className="rounded-xl px-4 py-2 text-xs"
          onClick={() => setModal("content")}
        >
          Content
        </Button>
        <div className="w-52">
          <Dropdown
            value={activeLayoutId}
            options={layoutOptions}
            onChange={(v) => {
              if (v === "__save") {
                setModal("save");
                return;
              }
              const layout = layouts.find((l) => l.id === v);
              if (layout) applyLayout(layout);
            }}
            trigger={
              <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-2 text-sm shadow-sm">
                <span className="truncate text-ink-900">
                  {activeLayout ? activeLayout.name : "Layouts"}
                </span>
              </div>
            }
          />
        </div>
        <div className="flex-1" />
        {layoutType === "document" && docType === "VOUCHER" && selectedVoucher && (
          <p className="mr-1 text-xs text-ink-500">
            {selectedVoucher.number} · {formatPKR(parseFloat(selectedVoucher.amount))}
          </p>
        )}
        {layoutType === "document" && docType !== "VOUCHER" && selectedDoc && (
          <p className="mr-1 text-xs text-ink-500">
            {selectedDoc.number} · {formatPKR(selectedDoc.total)}
          </p>
        )}
        <Button
          className="px-4 py-2 text-xs"
          onClick={() => window.print()}
          disabled={
            layoutType === "inventory"
              ? units.length === 0
              : docType === "VOUCHER"
                ? !selectedVoucher
                : !detail
          }
        >
          <PrinterIcon className="h-4 w-4" />
          Print
        </Button>
      </div>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-ink-900/5">
        <div className="flex flex-1 justify-center overflow-auto overscroll-none p-4">
          {layoutType === "inventory" ? (
            loadingUnits ? (
              <p className="py-10 text-sm text-ink-400">Loading inventory…</p>
            ) : units.length > 0 ? (
              <div
                id="print-area"
                style={{ width: fmt.previewWidth }}
                className="shrink-0 bg-white shadow-lg transition-all"
              >
                <InventoryDocument
                  units={units}
                  options={invOptions}
                  format={fmt.id}
                  profile={profile}
                  showCost={showCost}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <PrinterIcon className="h-8 w-8 text-ink-300" />
                <p className="text-sm text-ink-400">{INVENTORY_TEXT.noData}</p>
              </div>
            )
          ) : docType === "VOUCHER" ? (
            loadingVouchers ? (
              <p className="py-10 text-sm text-ink-400">Loading vouchers…</p>
            ) : selectedVoucher ? (
              <div
                id="print-area"
                style={{ width: fmt.previewWidth }}
                className="shrink-0 bg-white shadow-lg transition-all"
              >
                <VoucherDocument
                  voucher={selectedVoucher}
                  options={options}
                  format={format}
                  profile={profile}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <PrinterIcon className="h-8 w-8 text-ink-300" />
                <p className="text-sm text-ink-400">
                  {selectedId ? "Loading…" : "Pick a voucher from the list to preview it."}
                </p>
              </div>
            )
          ) : loadingDoc ? (
            <p className="py-10 text-sm text-ink-400">Loading document…</p>
          ) : detail ? (
              <div
                id="print-area"
                style={{ width: fmt.previewWidth }}
                className="shrink-0 bg-white shadow-lg transition-all"
              >
                <ReceiptDocument
                  detail={detail}
                  options={options}
                  format={format}
                  qrUrl={qrUrl}
                  qrType={qrType}
                  profile={profile}
                  bankAccounts={bankAccounts}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <PrinterIcon className="h-8 w-8 text-ink-300" />
                <p className="text-sm text-ink-400">
                  {selectedId ? "Loading…" : "Pick a document from the list to preview it."}
                </p>
              </div>
            )}
          </div>
        </section>

      <PrintModal
        open={typePickerOpen}
        title="What do you want to print?"
        onClose={() => {
          setDocType("SALE");
          setLayoutType("document");
          setTypePickerOpen(false);
        }}
      >
        <div className="space-y-2">
          {DOC_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => {
                setDocType(t.value);
                setLayoutType("document");
                setTypePickerOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-2xl border border-ink-100 px-4 py-3 text-left transition hover:bg-ink-50"
            >
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${TYPE_DOT[t.value]}`} />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink-900">{t.label}</span>
                <span className="block text-xs text-ink-500">{t.hint}</span>
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setLayoutType("inventory");
              setTypePickerOpen(false);
            }}
            className="flex w-full items-center gap-3 rounded-2xl border border-ink-100 px-4 py-3 text-left transition hover:bg-ink-50"
          >
            <InventoryIcon className="h-4 w-4 shrink-0 text-ink-400" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink-900">Inventory list</span>
              <span className="block text-xs text-ink-500">Full stock list of your inventory</span>
            </span>
          </button>
        </div>
      </PrintModal>

      <PrintModal open={modal === "format"} title="Printer format" onClose={() => setModal(null)}>
        <div className="space-y-2">
          {availableFormats.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFormat(f.id)}
              className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                activeFormat === f.id ? "border-brand-300 bg-brand-50" : "border-ink-100 hover:bg-ink-50"
              }`}
            >
              <span>
                <span className="block text-sm font-semibold text-ink-900">{f.label}</span>
                <span className="block text-xs text-ink-500">{f.hint}</span>
              </span>
              {activeFormat === f.id && <span className="text-sm font-bold text-brand-600">✓</span>}
            </button>
          ))}
        </div>
      </PrintModal>

      <PrintModal
        open={modal === "content"}
        title={layoutType === "inventory" ? "Inventory content" : "Receipt content"}
        onClose={() => setModal(null)}
      >
        {layoutType === "inventory" ? (
          <>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Columns</p>
            <div className="space-y-2.5">
              {INVENTORY_OPTION_LABELS.map((opt) => (
                <Checkbox
                  key={opt.key}
                  checked={invOptions[opt.key]}
                  onChange={() => invToggle(opt.key)}
                  label={opt.label}
                  description={opt.hint}
                />
              ))}
            </div>
            {!showCost && (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                Cost column is hidden for your role.
              </p>
            )}
          </>
        ) : (
          <>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">QR code</p>
            <div className="grid grid-cols-3 gap-1.5">
              {QR_TARGETS.map((t) => (
                <Button
                  key={t.id}
                  size="sm"
                  variant={qrType === t.id ? "secondary" : "ghost"}
                  title={t.hint}
                  onClick={() => setQrType(t.id)}
                  className={`rounded-xl border text-center ${
                    qrType === t.id ? "border-brand-300" : "border-ink-100"
                  }`}
                >
                  <span className="block text-xs font-semibold">{t.label}</span>
                </Button>
              ))}
            </div>
            {qrType !== "none" && !profile?.whatsapp?.trim() && (
              <p className="mt-1.5 text-[11px] text-amber-600">{qrMissingHint}</p>
            )}

            <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-ink-500">Show / hide</p>
            <div className="space-y-2.5">
              {PRINT_OPTION_LABELS.map((opt) => (
                <Checkbox
                  key={opt.key}
                  checked={options[opt.key]}
                  onChange={() => toggle(opt.key)}
                  label={opt.label}
                  description={opt.hint}
                />
              ))}
            </div>
          </>
        )}
      </PrintModal>

      <PrintModal open={modal === "save"} title="Save layout" onClose={() => setModal(null)}>
        <div className="flex gap-1.5">
          <Input
            value={layoutName}
            onChange={(e) => setLayoutName(e.target.value)}
            placeholder="Layout name (e.g. 80mm sales)"
            variant="white"
            className="bg-ink-100 py-2 text-sm"
          />
          <Button size="sm" onClick={saveLayout} loading={savingLayout} loadingText="Saving…">
            Save
          </Button>
        </div>
        {activeLayout && (
          <div className="mt-3 flex items-center justify-between rounded-2xl bg-ink-50 px-3.5 py-2">
            <span className="min-w-0 truncate text-sm font-semibold text-ink-900">
              {activeLayout.name}
            </span>
            <div className="flex shrink-0 gap-1.5">
              {!activeLayout.isDefault && (
                <Button size="sm" variant="grey" onClick={() => setDefaultLayout(activeLayout.id)}>
                  <span className="text-sm">★</span>
                  Set default
                </Button>
              )}
              <Button
                size="sm"
                variant="destructive"
                onClick={() => removeLayout(activeLayout.id)}
              >
                <TrashIcon className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </PrintModal>

      {typeof document !== "undefined" &&
        createPortal(
          <>
            <style>{printCss}</style>
            <div id="print-portal">
              {layoutType === "inventory" ? (
                units.length > 0 && (
                  <div className="print-doc">
                    <InventoryDocument
                      units={units}
                      options={invOptions}
                      format={fmt.id}
                      profile={profile}
                      showCost={showCost}
                    />
                  </div>
                )
              ) : docType === "VOUCHER" ? (
                selectedVoucher && (
                  <div className="print-doc">
                    <VoucherDocument
                      voucher={selectedVoucher}
                      options={options}
                      format={format}
                      profile={profile}
                    />
                  </div>
                )
              ) : (
                detail && (
                  <div className="print-doc">
                    <ReceiptDocument
                      detail={detail}
                      options={options}
                      format={format}
                      qrUrl={qrUrl}
                      qrType={qrType}
                      profile={profile}
                      bankAccounts={bankAccounts}
                    />
                  </div>
                )
              )}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}

function InventoryDocument({
  units,
  options,
  format,
  profile,
  showCost,
}: {
  units: Unit[];
  options: InventoryPrintOptions;
  format: PrintFormatId;
  profile: CompanyProfile | null;
  showCost: boolean;
}) {
  const { user } = useAuth();
  const isA4 = format === "a4";

  const groups = useMemo(() => {
    const map = new Map<string, { key: string; units: Unit[] }>();
    for (const u of units) {
      const key = u.product.category ?? "Other";
      let g = map.get(key);
      if (!g) {
        g = { key, units: [] };
        map.set(key, g);
      }
      g.units.push(u);
    }
    const list = [...map.values()];
    const prio = ["New Phone", "Used Phone", "Accessory"];
    list.sort((a, b) => {
      const ia = prio.indexOf(a.key);
      const ib = prio.indexOf(b.key);
      if (ia !== -1 || ib !== -1) {
        if (ia !== -1 && ib !== -1) return ia - ib;
        return ia !== -1 ? -1 : 1;
      }
      return a.key.localeCompare(b.key);
    });
    for (const g of list) {
      g.units.sort((a, b) => {
        const na = `${a.product.brand} ${a.product.model}`.toLowerCase();
        const nb = `${b.product.brand} ${b.product.model}`.toLowerCase();
        if (na < nb) return -1;
        if (na > nb) return 1;
        return a.imei.localeCompare(b.imei);
      });
    }
    return list;
  }, [units]);

  const totalCount = units.length;
  const inStockCount = units.filter((u) => u.status === "IN_STOCK").length;
  const costTotal = units.reduce((s, u) => s + (parseFloat(u.costPrice ?? "") || 0), 0);
  const sellTotal = units.reduce((s, u) => s + (parseFloat(u.product.sellPrice ?? "") || 0), 0);
  const pad = isA4 ? "px-10 py-8" : "px-4 py-4";
  const base = isA4 ? "text-xs" : "text-[11px]";

  return (
    <div className={`bg-white ${pad} ${base} text-ink-900`}>
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <p className={isA4 ? "break-words text-2xl font-bold tracking-tight text-ink-900" : "break-words text-base font-bold uppercase tracking-wide text-ink-900"}>
            {profile?.name ?? APP.nameFull}
          </p>
          {options.shopInfo && profile?.tagline && <p className="text-ink-500">{profile.tagline}</p>}
          {options.shopInfo && (profile?.address || profile?.phone) && (
            <p className="text-ink-500">{[profile.address, profile.phone].filter(Boolean).join(" · ")}</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className={isA4 ? "text-2xl font-bold uppercase tracking-wide text-ink-900" : "text-sm font-bold uppercase tracking-widest text-ink-900"}>
            {INVENTORY_TEXT.title}
          </p>
          <div className={`${isA4 ? "mt-3" : "mt-2"} space-y-0.5 border-t-2 border-ink-900 pt-1.5`}>
            <div className="flex items-baseline justify-between gap-4 text-[10px]">
              <span className="uppercase tracking-wider text-ink-500">{INVENTORY_TEXT.generated}</span>
              <span className="font-semibold text-ink-900">{new Date().toLocaleString()}</span>
            </div>
            <div className="flex items-baseline justify-between gap-4 text-[10px]">
              <span className="uppercase tracking-wider text-ink-500">{INVENTORY_TEXT.totalUnits}</span>
              <span className="font-semibold text-ink-900">{totalCount}</span>
            </div>
            {user?.name && (
              <div className="flex items-baseline justify-between gap-4 text-[10px]">
                <span className="uppercase tracking-wider text-ink-500">{INVENTORY_TEXT.printedBy}</span>
                <span className="font-semibold text-ink-900">{user.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {isA4 ? (
        <InventoryTable groups={groups} options={options} showCost={showCost} />
      ) : (
        <div className="mt-4">
          {groups.map((g) => (
            <div key={g.key} className="mb-3">
              <p className="border-b-2 border-ink-900 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-900">
                {g.key} <span className="font-normal text-ink-500">· {g.units.length}</span>
              </p>
              {g.units.map((u) => (
                <div key={u.id} className="border-b border-dashed border-ink-200 py-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-semibold text-ink-900">
                      {u.product.brand} {u.product.model} {u.product.storage ?? ""}
                    </p>
                    <p className="whitespace-nowrap font-semibold text-ink-900">
                      {options.sell && u.product.sellPrice ? formatPKR(u.product.sellPrice) : ""}
                    </p>
                  </div>
                  <p className="font-mono text-[10px] text-ink-700">{u.imei}</p>
                  <p className="text-[10px] text-ink-500">
                    {[
                      u.product.color,
                      u.condition,
                      STATUS_LABEL[u.status] ?? u.status,
                      CARRIER_LABELS[u.carrier] ?? u.carrier,
                      u.grade ? `Grade ${u.grade}` : "",
                      u.batteryHealth != null ? `${u.batteryHealth}% batt` : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className={`${isA4 ? "mt-8" : "mt-4"} border-t-2 border-ink-900 pt-2`}>
        <PrintRow label={INVENTORY_TEXT.totalUnits} value={String(totalCount)} bold />
        <PrintRow label={INVENTORY_TEXT.inStock} value={String(inStockCount)} />
        {showCost && <PrintRow label={INVENTORY_TEXT.stockValue} value={formatPKR(costTotal)} />}
        <PrintRow label={INVENTORY_TEXT.salesValue} value={formatPKR(sellTotal)} />
      </div>

      {options.signature && (
        <div className={`mt-10 ${isA4 ? "w-64" : "mt-6"}`}>
          <div className="border-t border-ink-300 pt-1 text-center text-[10px] uppercase tracking-widest text-ink-400">
            {INVENTORY_TEXT.signature}
          </div>
        </div>
      )}

      {options.footer && (
        <div className={`${isA4 ? "mt-8" : "mt-5"} border-t border-dashed border-ink-200 pt-3`}>
          <p className="text-center text-[10px] uppercase tracking-widest text-ink-400">
            {profile?.footerText ?? RECEIPT_TEXT.footerFallback}
          </p>
        </div>
      )}
    </div>
  );
}

function InventoryTable({
  groups,
  options,
  showCost,
}: {
  groups: { key: string; units: Unit[] }[];
  options: InventoryPrintOptions;
  showCost: boolean;
}) {
  const cols: { key: string; label: string; right?: boolean }[] = [];
  if (options.imeis) cols.push({ key: "imei", label: "IMEI" });
  if (options.product) cols.push({ key: "product", label: "Product" });
  if (options.color) cols.push({ key: "color", label: "Color" });
  if (options.condition) cols.push({ key: "condition", label: "Cond." });
  if (options.status) cols.push({ key: "status", label: "Status" });
  if (options.carrier) cols.push({ key: "carrier", label: "Carrier" });
  if (options.grade || options.battery) cols.push({ key: "gradeBatt", label: "Grade / Batt" });
  if (options.vendor) cols.push({ key: "vendor", label: "Vendor" });
  if (options.purchased) cols.push({ key: "purchased", label: "Purchased" });
  if (options.sell) cols.push({ key: "sell", label: "Sell", right: true });
  if (options.retail) cols.push({ key: "retail", label: "Retail", right: true });
  if (showCost) cols.push({ key: "cost", label: "Cost", right: true });

  return (
    <table className="mt-4 w-full border-collapse">
      <thead>
        <tr className="border-y-2 border-ink-900 text-left text-[9px] uppercase tracking-wider text-ink-500">
          <th className="py-1.5 pr-1 font-semibold">{INVENTORY_TEXT.no}</th>
          {cols.map((c) => (
            <th key={c.key} className={`py-1.5 pr-1 font-semibold ${c.right ? "text-right" : ""}`}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {groups.map((g) => (
          <Fragment key={g.key}>
            <tr>
              <td
                colSpan={cols.length + 1}
                className="bg-ink-50/70 px-1 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-900"
              >
                {g.key} · {g.units.length} {g.units.length === 1 ? INVENTORY_TEXT.unit : INVENTORY_TEXT.units}
              </td>
            </tr>
            {g.units.map((u, i) => (
              <tr key={u.id} className="border-b border-ink-100">
                <td className="py-1 pr-1 align-top text-[9px] text-ink-500">{i + 1}</td>
                {options.imeis && (
                  <td className="py-1 pr-1 align-top font-mono text-[9px] text-ink-700">{u.imei}</td>
                )}
                {options.product && (
                  <td className="py-1 pr-1 align-top">
                    <span className="font-semibold text-ink-900">
                      {u.product.brand} {u.product.model}
                    </span>
                    {u.product.storage && <span className="text-ink-500"> {u.product.storage}</span>}
                  </td>
                )}
                {options.color && <td className="py-1 pr-1 align-top text-ink-700">{u.product.color ?? "—"}</td>}
                {options.condition && <td className="py-1 pr-1 align-top text-ink-700">{u.condition}</td>}
                {options.status && (
                  <td className="py-1 pr-1 align-top text-ink-700">{STATUS_LABEL[u.status] ?? u.status}</td>
                )}
                {options.carrier && (
                  <td className="py-1 pr-1 align-top text-ink-700">{CARRIER_LABELS[u.carrier] ?? u.carrier}</td>
                )}
                {(options.grade || options.battery) && (
                  <td className="py-1 pr-1 align-top text-ink-700">
                    {[u.grade ? `G${u.grade}` : "", u.batteryHealth != null ? `${u.batteryHealth}%` : ""]
                      .filter(Boolean)
                      .join(" ") || "—"}
                  </td>
                )}
                {options.vendor && (
                  <td className="py-1 pr-1 align-top text-ink-700">{u.purchase?.vendor ?? "—"}</td>
                )}
                {options.purchased && (
                  <td className="py-1 pr-1 align-top text-ink-700">
                    {u.purchase ? new Date(u.purchase.date).toLocaleDateString() : "—"}
                  </td>
                )}
                {options.sell && (
                  <td className="py-1 pr-1 text-right align-top text-ink-900">
                    {u.product.sellPrice ? formatPKR(u.product.sellPrice) : "—"}
                  </td>
                )}
                {options.retail && (
                  <td className="py-1 pr-1 text-right align-top text-ink-700">
                    {u.product.retailPrice ? formatPKR(u.product.retailPrice) : "—"}
                  </td>
                )}
                {showCost && <td className="py-1 text-right align-top text-ink-700">{formatPKR(u.costPrice)}</td>}
              </tr>
            ))}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}

function PrintModal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4">
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl bg-white p-4">
        <div className="flex shrink-0 items-center justify-between">
          <h3 className="text-lg font-bold text-ink-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-xl p-1.5 text-ink-400 transition hover:bg-ink-50 hover:text-ink-900"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-none">{children}</div>
      </div>
    </div>
  );
}

function ReceiptDocument({
  detail,
  options,
  format,
  qrUrl,
  qrType,
  profile,
  bankAccounts,
}: {
  detail: TransactionDetail;
  options: PrintBooleanOptions;
  format: PrintFormatId;
  qrUrl: string | null;
  qrType: QrTarget;
  profile: CompanyProfile | null;
  bankAccounts: BankAccount[];
}) {
  const isA4 = format === "a4";
  const pad = isA4 ? "px-12 py-10" : "px-5 py-6";
  const base = isA4 ? "text-sm" : "text-[11px]";
  const divider = isA4 ? "border-t border-ink-200" : "border-t-2 border-dashed border-ink-200";
  const showAccounts = options.bankAccounts && bankAccounts.length > 0;
  const paidFullyInCash =
    detail.payments.length > 0 &&
    detail.payments.every((p) => p.method === "CASH") &&
    detail.payments.reduce((sum, p) => sum + Number(p.amount), 0) >= Number(detail.total);

  return (
    <div className={`bg-white ${pad} ${base} text-ink-900`}>
      {isA4 ? (
        <A4Header detail={detail} options={options} profile={profile} />
      ) : (
        <ThermalHeader
          detail={detail}
          options={options}
          profile={profile}
          qrUrl={qrUrl}
          qrType={qrType}
        />
      )}

      <div className={`my-4 ${divider}`} />

      {!isA4 && (
        <>
          <ThermalMeta detail={detail} options={options} />
          <div className={`my-4 ${divider}`} />
        </>
      )}

      {isA4 ? <A4Items detail={detail} options={options} /> : <ThermalItems detail={detail} options={options} />}

      <div className={`my-3 ${divider}`} />

      {isA4 ? (
        <A4Totals detail={detail} />
      ) : (
        <ThermalTotals detail={detail} />
      )}

      {options.payments && detail.payments.length > 0 && (
        <div className={`${isA4 ? "mt-6" : "mt-3"} space-y-1`}>
          <p className="text-[10px] uppercase tracking-wider text-ink-500">{RECEIPT_TEXT.payments}</p>
          {detail.payments.map((p) => (
            <PrintRow
              key={p.id}
              label={formatPaymentMethod(p.method)}
              value={formatPKR(p.amount)}
            />
          ))}
        </div>
      )}

      {isReturn(detail.type) && detail.payments.length > 0 && (
        <div className={`avoid-break ${isA4 ? "mt-6" : "mt-3"} rounded-xl bg-ink-50 px-3 py-2`}>
          <p className="text-[10px] uppercase tracking-wider text-ink-500">{RECEIPT_TEXT.terms}</p>
          <p className="mt-0.5 text-sm font-semibold text-ink-900">
            {detail.payments.some((p) => p.method === "CREDIT")
              ? detail.payments.some((p) => p.method === "CASH")
                ? RECEIPT_TEXT.refundPartial
                : RECEIPT_TEXT.refundCredit
              : RECEIPT_TEXT.refundCash}
          </p>
        </div>
      )}

      {paidFullyInCash && (
        <div className={`avoid-break flex justify-center ${isA4 ? "mt-6" : "mt-3"}`}>
          <span
            className={`-rotate-6 inline-flex flex-col items-center rounded-md border-[3px] border-emerald-600/70 text-emerald-600/80 ${
              isA4 ? "px-10 py-3" : "px-6 py-1.5"
            }`}
            style={{ boxShadow: "inset 0 0 0 2px #fff, inset 0 0 0 4px rgba(5,150,105,0.35)" }}
          >
            <span className={`font-black uppercase tracking-[0.18em] ${isA4 ? "text-4xl" : "text-base"}`}>
              {RECEIPT_TEXT.paid}
            </span>
            <span className={`font-medium uppercase tracking-[0.2em] text-emerald-600/60 ${isA4 ? "mt-1.5 text-sm" : "mt-0.5 text-[11px]"}`}>
              {new Date(detail.createdAt).toLocaleDateString()}
            </span>
          </span>
        </div>
      )}

      {options.note && (
        <div className="mt-4">
          <p className="text-[10px] uppercase tracking-wider text-ink-500">{RECEIPT_TEXT.note}</p>
          <p
            className={`mt-1 ${
              detail.note
                ? "rounded-xl bg-ink-50 px-3 py-2 text-ink-600"
                : "border border-dashed border-ink-200 px-3 py-2 text-ink-400"
            }`}
          >
            {detail.note || RECEIPT_TEXT.noNotes}
          </p>
        </div>
      )}

      {showAccounts && <BankAccountsBlock accounts={bankAccounts} isA4={isA4} />}

      {(qrType !== "none" && qrUrl && isA4) || options.barcode ? (
        <div className={`${isA4 ? "mt-8" : "mt-5"} ${isA4 && qrType !== "none" && qrUrl && options.barcode ? "grid grid-cols-2 items-center" : "flex justify-center"}`}>
          {qrType !== "none" && qrUrl && isA4 && (
            <img src={qrUrl} alt={`${qrType} QR`} width={110} height={110} className="mx-auto" />
          )}
          {options.barcode && (
            <div className="flex flex-col items-center">
              {isA4 && (
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-ink-400">
                  Barcode
                </p>
              )}
              <ReceiptBarcode value={detail.number} format={format} />
              <p
                className={`mt-2 font-mono tracking-widest ${
                  isA4 ? "text-xs font-semibold text-ink-700" : "text-[9px] text-ink-500"
                }`}
              >
                {detail.number}
              </p>
            </div>
          )}
        </div>
      ) : null}

      {options.signature && (
        <div className={`avoid-break ${isA4 ? "mt-14 flex justify-between gap-10" : "mt-8"}`}>
          <div className={`${isA4 ? "w-64" : ""} border-t border-ink-300 pt-1 text-center text-[10px] uppercase tracking-widest text-ink-400`}>
            {RECEIPT_TEXT.signature}
          </div>
          {isA4 && (
            <div className="w-64 border-t border-ink-300 pt-1 text-center text-[10px] uppercase tracking-widest text-ink-400">
              {RECEIPT_TEXT.receivedBy}
            </div>
          )}
        </div>
      )}

      {options.thanks && (
        <div className={`${divider} ${isA4 ? "mt-8" : "mt-6"} pt-4`}>
          <p className="text-center text-[10px] uppercase tracking-widest text-ink-400">
            {profile?.footerText ?? RECEIPT_TEXT.footerFallback}
          </p>
        </div>
      )}
    </div>
  );
}

function VoucherDocument({
  voucher,
  options,
  format,
  profile,
}: {
  voucher: Voucher;
  options: PrintBooleanOptions;
  format: PrintFormatId;
  profile: CompanyProfile | null;
}) {
  const isA4 = format === "a4";
  const pad = isA4 ? "px-12 py-10" : "px-5 py-6";
  const base = isA4 ? "text-sm" : "text-[11px]";
  const divider = isA4 ? "border-t border-ink-200" : "border-t-2 border-dashed border-ink-200";
  const receiving = voucher.type === "RECEIVING";

  return (
    <div className={`bg-white ${pad} ${base} text-ink-900`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {options.header && (
            <>
              {profile?.logoUrl && (
                <img src={profile.logoUrl} alt="" className="mb-2 max-h-16 w-auto object-contain" />
              )}
              <p className="break-words text-base font-bold uppercase tracking-wide text-ink-900">
                {profile?.name ?? APP.nameFull}
              </p>
              {options.shopInfo && hasShopInfo(profile) && (
                <div className="mt-1 space-y-0.5 text-ink-500">
                  {profile?.tagline && <p>{profile.tagline}</p>}
                  {profile?.address && <p>{profile.address}</p>}
                  {profile?.phone && <p className="font-medium text-ink-700">☎ Contact: {profile.phone}</p>}
                </div>
              )}
            </>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="whitespace-nowrap text-sm font-bold uppercase tracking-widest text-ink-900">
            {VOUCHER_TYPE_LABELS[voucher.type]} Voucher
          </p>
        </div>
      </div>

      <div className={`my-4 ${divider}`} />

      <div className="space-y-1">
        <PrintRow label="Voucher No." value={voucher.number} />
        <PrintRow label="Date" value={formatDateTime(voucher.date)} />
        <PrintRow label="Type" value={VOUCHER_TYPE_LABELS[voucher.type]} />
        {voucher.contact && <PrintRow label="Contact" value={voucher.contact.name} />}
        {voucher.contact?.phone && <PrintRow label="Phone" value={voucher.contact.phone} />}
        <PrintRow label="Method" value={VOUCHER_METHOD_LABELS[voucher.method]} />
        {voucher.method === "BANK_TRANSFER" && voucher.bankAccount && (
          <PrintRow label="Bank" value={`${voucher.bankAccount.bankName} · ${voucher.bankAccount.accountNo}`} />
        )}
        <PrintRow label="Processed by" value={voucher.user.name} />
      </div>

      <div className={`my-4 ${divider}`} />

      <div className="flex flex-col items-center">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">
          {receiving ? "Amount received" : "Amount paid"}
        </p>
        <p className={`mt-1 font-black text-ink-900 ${isA4 ? "text-4xl" : "text-2xl"}`}>
          {receiving ? "+" : "-"}
          {formatPKR(parseFloat(voucher.amount))}
        </p>
      </div>

      <div className={`my-4 ${divider}`} />

      <div className="avoid-break">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">Narration</p>
        <p
          className={`mt-1 ${
            voucher.narration
              ? "rounded-xl bg-ink-50 px-3 py-2 text-ink-600"
              : "border border-dashed border-ink-200 px-3 py-2 text-ink-400"
          }`}
        >
          {voucher.narration || "No narration"}
        </p>
      </div>

      {voucher.status === "REVERSED" && (
        <div className="avoid-break mt-4 rounded-xl bg-ink-50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">Voucher reversed</p>
          <p className="mt-0.5 text-sm font-semibold text-ink-900">
            {voucher.reversedBy?.name ? `By ${voucher.reversedBy.name}` : "Reversed"}
            {voucher.reversedAt ? ` · ${formatDateTime(voucher.reversedAt)}` : ""}
          </p>
          {voucher.reversalNote && <p className="mt-0.5 text-xs text-ink-600">{voucher.reversalNote}</p>}
        </div>
      )}

      {options.signature && (
        <div className="avoid-break mt-8">
          <div className="w-64 border-t border-ink-300 pt-1 text-center text-[10px] uppercase tracking-widest text-ink-400">
            Authorized signature
          </div>
        </div>
      )}

      {options.thanks && profile?.footerText && (
        <div className={`${divider} mt-6 pt-4`}>
          <p className="text-center text-[10px] uppercase tracking-widest text-ink-400">{profile.footerText}</p>
        </div>
      )}
    </div>
  );
}

function formatPaymentMethod(method: string) {
  return method.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function isReturn(type: string) {
  return type === "SALE_RETURN" || type === "PURCHASE_RETURN";
}

function hasShopInfo(profile: CompanyProfile | null): boolean {
  return Boolean(profile?.tagline || profile?.address || profile?.phone);
}

function ThermalHeader({
  detail,
  options,
  profile,
  qrUrl,
  qrType,
}: {
  detail: TransactionDetail;
  options: PrintBooleanOptions;
  profile: CompanyProfile | null;
  qrUrl: string | null;
  qrType: QrTarget;
}) {
  if (!options.header) return null;
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        {profile?.logoUrl && (
          <img src={profile.logoUrl} alt="" className="mb-2 max-h-14 w-auto object-contain" />
        )}
        <p className="break-words text-base font-bold uppercase tracking-wide text-ink-900">
          {profile?.name ?? APP.nameFull}
        </p>
        {options.shopInfo && hasShopInfo(profile) && (
          <div className="mt-1 space-y-0.5 text-ink-500">
            {profile?.tagline && <p>{profile.tagline}</p>}
            {profile?.address && <p>{profile.address}</p>}
            {profile?.phone && <p className="font-medium text-ink-700">☎ Contact: {profile.phone}</p>}
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-center">
        {qrType !== "none" && qrUrl && (
          <img src={qrUrl} alt={`${qrType} QR`} width={72} height={72} className="mb-1" />
        )}
        <p className="whitespace-nowrap text-sm font-bold uppercase tracking-widest text-ink-900">
          {TYPE_TITLE[detail.type] ?? RECEIPT_TEXT.document.fallback}
        </p>
      </div>
    </div>
  );
}

function ThermalMeta({ detail, options }: { detail: TransactionDetail; options: PrintBooleanOptions }) {
  const rows: { label: string; value: string }[] = [];
  if (options.number) rows.push({ label: RECEIPT_TEXT.receiptNo, value: detail.number });
  if (options.date) rows.push({ label: RECEIPT_TEXT.date, value: formatDateTime(detail.createdAt) });
  if (options.contact) rows.push({ label: RECEIPT_TEXT.contact, value: detail.contact.name });
  if (options.phone && detail.contact.phone) rows.push({ label: RECEIPT_TEXT.phone, value: detail.contact.phone });
  if (options.cashier && detail.user.name) rows.push({ label: RECEIPT_TEXT.processedBy, value: detail.user.name });
  if (rows.length === 0) return null;

  return (
    <div>
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-4">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-ink-400">
            {row.label}
          </span>
          <span className="text-right font-semibold text-ink-900">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function ThermalTotals({ detail }: { detail: TransactionDetail }) {
  return (
    <div className="space-y-1">
      <PrintRow label={RECEIPT_TEXT.subtotal} value={formatPKR(detail.subtotal)} />
      {Number(detail.discount) > 0 && (
        <PrintRow label={RECEIPT_TEXT.discount} value={`-${formatPKR(detail.discount)}`} />
      )}
      <div className="my-1.5 border-t-2 border-dashed border-ink-300" />
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-bold uppercase tracking-wide text-ink-900">{RECEIPT_TEXT.grandTotal}</span>
        <span className="text-base font-bold text-ink-900">{formatPKR(detail.total)}</span>
      </div>
    </div>
  );
}

function A4Header({
  detail,
  options,
  profile,
}: {
  detail: TransactionDetail;
  options: PrintBooleanOptions;
  profile: CompanyProfile | null;
}) {
  return (
    <div className="flex items-start justify-between gap-8">
      {options.header ? (
        <div className="max-w-xs">
          {profile?.logoUrl && (
            <img src={profile.logoUrl} alt="" className="mb-2 max-h-16 w-auto object-contain" />
          )}
          <p className="break-words text-2xl font-bold tracking-tight text-ink-900">
            {profile?.name ?? APP.nameFull}
          </p>
          {options.shopInfo && hasShopInfo(profile) && (
            <div className="mt-2 space-y-0.5 text-ink-500">
              {profile?.tagline && <p>{profile.tagline}</p>}
              {profile?.address && <p>{profile.address}</p>}
              {profile?.phone && <p>{RECEIPT_TEXT.phone}: {profile.phone}</p>}
            </div>
          )}
        </div>
      ) : (
        <span />
      )}
      <div className="text-right">
        <p className="text-2xl font-bold uppercase tracking-wide text-ink-900">
        {TYPE_TITLE[detail.type] ?? RECEIPT_TEXT.document.fallback}
        </p>
        <div className="mt-3 space-y-1 border-t-2 border-ink-900 pt-2">
          {options.number && <A4MetaRow label={RECEIPT_TEXT.receiptNo} value={detail.number} />}
          {options.date && <A4MetaRow label={RECEIPT_TEXT.date} value={formatDateTime(detail.createdAt)} />}
          {options.contact && <A4MetaRow label={RECEIPT_TEXT.contact} value={detail.contact.name} />}
          {options.phone && detail.contact.phone ? (
            <A4MetaRow label={RECEIPT_TEXT.phone} value={detail.contact.phone} />
          ) : null}
          {options.cashier && detail.user.name ? <A4MetaRow label={RECEIPT_TEXT.processedBy} value={detail.user.name} /> : null}
        </div>
      </div>
    </div>
  );
}

function A4MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-8 text-sm">
      <span className="text-ink-500">{label}</span>
      <span className="font-semibold text-ink-900">{value}</span>
    </div>
  );
}

function ThermalItems({ detail, options }: { detail: TransactionDetail; options: PrintBooleanOptions }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">{RECEIPT_TEXT.items}</p>
      <div className="my-1 border-b-2 border-ink-900" />
      {detail.items.map((item) => {
        const specs = [item.product.storage, item.product.ram].filter(Boolean).join(" · ");
        const unitPrice = Number(item.unitPrice) - Number(item.discount);
        return (
          <div key={item.id} className="border-b border-dashed border-ink-200 py-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-semibold text-ink-900">
                {item.product.brand} {item.product.model}
              </p>
              <p className="whitespace-nowrap text-right font-semibold text-ink-900">
                {formatPKR(item.total)}
              </p>
            </div>
            <p className="text-ink-500">
              {specs ? <span>{specs}</span> : null}
              {specs ? <span> · </span> : null}
              <span>
                <span className="font-semibold text-ink-900">
                  {item.quantity} {RECEIPT_TEXT.quantityUnits}
                </span>{" "}
                × {formatPKR(unitPrice)}
              </span>
            </p>
            {options.imeis && item.unit?.imei ? (
              <p className="font-mono text-[9px] text-ink-400">{RECEIPT_TEXT.imei}: {item.unit.imei}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function A4Items({ detail, options }: { detail: TransactionDetail; options: PrintBooleanOptions }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-y-2 border-ink-900 text-left text-[10px] uppercase tracking-wider text-ink-500">
          <th className="py-2 pr-2 font-semibold">{RECEIPT_TEXT.no}</th>
          <th className="py-2 pr-2 font-semibold">{RECEIPT_TEXT.productDescription}</th>
          <th className="py-2 pr-2 text-right font-semibold">{RECEIPT_TEXT.quantity}</th>
          <th className="py-2 pr-2 text-right font-semibold">{RECEIPT_TEXT.unitPrice}</th>
          <th className="py-2 text-right font-semibold">{RECEIPT_TEXT.amount}</th>
        </tr>
      </thead>
      <tbody>
        {detail.items.map((item, i) => {
          const effectivePrice = Number(item.unitPrice) - Number(item.discount);
          return (
            <tr key={item.id} className={i % 2 ? "bg-ink-50/60" : ""}>
              <td className="py-2 pr-2 align-top text-ink-500">{i + 1}</td>
              <td className="py-2 pr-2 align-top">
                <span className="font-semibold text-ink-900">
                  {item.product.brand} {item.product.model} {item.product.storage ?? ""}
                  {item.product.ram ? ` · ${item.product.ram}` : ""}
                </span>
                {item.quantity > 1 && (
                  <span className="ml-1 text-ink-500">
                    × <span className="font-semibold text-ink-900">{item.quantity} {RECEIPT_TEXT.quantityUnits}</span>
                  </span>
                )}
                {options.imeis && item.unit?.imei ? (
                  <span className="block font-mono text-[10px] text-ink-500">{RECEIPT_TEXT.imei}: {item.unit.imei}</span>
                ) : null}
              </td>
              <td className="py-2 pr-2 text-right align-top text-ink-700">{item.quantity}</td>
              <td className="py-2 pr-2 text-right align-top text-ink-700">
                {Number(item.discount) > 0 ? (
                  <>
                    <s className="text-ink-400">{formatPKR(item.unitPrice)}</s>{" "}
                    <span className="font-semibold text-ink-900">{formatPKR(effectivePrice)}</span>
                  </>
                ) : (
                  formatPKR(item.unitPrice)
                )}
              </td>
              <td className="py-2 text-right align-top font-semibold text-ink-900">{formatPKR(item.total)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function A4Totals({ detail }: { detail: TransactionDetail }) {
  return (
    <div className="flex justify-end">
      <div className="w-64 space-y-1">
        <PrintRow label={RECEIPT_TEXT.subtotal} value={formatPKR(detail.subtotal)} />
        {Number(detail.discount) > 0 && (
          <PrintRow label={RECEIPT_TEXT.discount} value={`-${formatPKR(detail.discount)}`} />
        )}
        <div className="mt-2 flex items-baseline justify-between gap-4 border-t-2 border-ink-900 pt-2">
          <span className="text-base font-bold text-ink-900">{RECEIPT_TEXT.total}</span>
          <span className="text-xl font-bold text-ink-900">{formatPKR(detail.total)}</span>
        </div>
      </div>
    </div>
  );
}

function BankAccountsBlock({ accounts, isA4 }: { accounts: BankAccount[]; isA4: boolean }) {
  return (
    <div className={isA4 ? "mt-8" : "mt-4"}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
        {PRINT.bankAccountsTitle}
      </p>
      <div className={isA4 ? "mt-2 grid grid-cols-2 gap-x-8 gap-y-4" : "mt-1.5 divide-y divide-dashed divide-ink-200"}>
        {accounts.map((account) => (
          <div key={account.id} className={isA4 ? "" : "py-1.5 first:pt-0"}>
            <p className="font-bold text-ink-900">Bank: {account.bankName}</p>
            <p className="mt-0.5 text-[11px] text-ink-800">Account No: {account.accountNo}</p>
            {account.iban && (
              <p className="break-all text-[10px] text-ink-500">IBAN: {account.iban}</p>
            )}
            {account.holderName && (
              <p className="text-[10px] text-ink-500">Account Holder: {account.holderName}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReceiptBarcode({ value, format }: { value: string; format: PrintFormatId }) {
  const ref = useRef<SVGSVGElement>(null);

  const sizes = {
    "58": { svgWidth: 244, barWidth: 2, height: 40 },
    "80": { svgWidth: 336, barWidth: 2, height: 48 },
    a4: { svgWidth: 360, barWidth: 1.6, height: 60 },
  }[format];

  useEffect(() => {
    if (!ref.current) return;
    const node = ref.current;
    node.replaceChildren();
    JsBarcode(node, value, {
      format: "CODE128",
      width: sizes.barWidth,
      height: sizes.height,
      displayValue: false,
      margin: 0,
    });
  }, [value, sizes.barWidth, sizes.height]);

  return (
    <svg
      ref={ref}
      style={{ width: sizes.svgWidth, height: sizes.height }}
      className="block"
    />
  );
}

function PrintRow({
  label,
  value,
  bold = false,
  large = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
  large?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className={`${bold ? "font-semibold" : ""} text-ink-500`}>{label}</span>
      <span className={`text-right ${bold ? "font-semibold" : ""} ${large ? "text-base" : ""} text-ink-900`}>
        {value}
      </span>
    </div>
  );
}

export default function PrintPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-ink-400">Loading…</div>}>
      <PrintStudioContent />
    </Suspense>
  );
}
