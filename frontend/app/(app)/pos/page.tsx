"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/apiClient";
import { useAuth } from "@/lib/auth-context";
import { brandOf, type BankAccount, type Contact, type ReservationConflict, type ReservationDetail, type TransactionDetail } from "@/lib/api-types";
import { useApi } from "@/lib/use-api";
import { CARRIER_LABELS } from "@/lib/constants";
import { formatPKR } from "@/lib/money";
import { toISODate } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/dropdown";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog } from "@/components/ui/dialog";
import { Sheet } from "@/components/ui/sheet";
import { Kbd } from "@/components/ui/kbd";
import { useToast } from "@/components/ui/toast";
import { useSaveShortcut } from "@/lib/use-save-shortcut";
import { PlusIcon, PosIcon, PrinterIcon, RefundIcon, ReservationIcon, SearchIcon, XIcon } from "@/components/icons";

type SearchResult = {
  id: string;
  brand: string;
  model: string;
  storage: string | null;
  ram: string | null;
  screenSize: string | null;
  color: string | null;
  category: { id: string; name: string; type: string };
  sellPrice: string;
  units: {
    id: string;
    imei: string;
    condition: "NEW" | "USED";
    carrier: "NON_PTA" | "PTA" | "SIM_LOCKED";
    status: "IN_STOCK" | "RESERVED";
  }[];
};

type CartLine = {
  key: string;
  productId: string;
  label: string;
  imei: string | null;
  unitId: string | null;
  unitPrice: number;
  quantity: number;
  condition?: "NEW" | "USED";
  carrier?: string;
};

type PaymentMode = "CASH" | "CARD" | "BANK" | "CREDIT" | "SPLIT";

const WALK_IN = "__walk_in__";

const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "BANK", label: "Bank" },
  { value: "CREDIT", label: "Credit" },
  { value: "SPLIT", label: "Partial / split" },
];

export default function PosPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const { data: contacts, refetch: refetchContacts } = useApi<Contact[]>("/contact");
  const { data: bankData } = useApi<BankAccount[]>("/bank-account");
  useEffect(() => {
    if (bankData) {
      setBankAccounts(bankData);
      const def = bankData.find((b) => b.isDefault) ?? bankData[0];
      setBankId((prev) => (prev && bankData.some((b) => b.id === prev) ? prev : def?.id ?? null));
    }
  }, [bankData]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [contactId, setContactId] = useState<string | null>(null);
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");
  const [cash, setCash] = useState("");
  const [card, setCard] = useState("");
  const [credit, setCredit] = useState("");
  const [bankAmount, setBankAmount] = useState("");
  const [bankId, setBankId] = useState<string | null>(null);
  const [bankRows, setBankRows] = useState<{ id: string; amount: string; bankId: string }[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<TransactionDetail | null>(null);
  const [conflicts, setConflicts] = useState<ReservationConflict[] | null>(null);
  const confirmedRef = useRef(false);
  const [mode, setMode] = useState<PaymentMode>("CASH");
  const [reservationPickOpen, setReservationPickOpen] = useState(false);
  const [pickReservations, setPickReservations] = useState<ReservationDetail[] | null>(null);
  const [pickLoading, setPickLoading] = useState(false);
  const [loadedReservation, setLoadedReservation] = useState<{
    id: string;
    number: string;
    type: "RESERVATION" | "CONSIGNMENT";
    advance: number;
    contactId: string;
  } | null>(null);
  const [saleDate, setSaleDate] = useState(() => toISODate(new Date()));
  const [invoiceNo, setInvoiceNo] = useState("SAL-0001");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const total = useMemo(
    () => cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
    [cart],
  );

  const cartGroups = useMemo(() => {
    const map = new Map<string, { key: string; label: string; unitPrice: number; lines: CartLine[] }>();
    const plain: CartLine[] = [];
    for (const line of cart) {
      if (line.imei) {
        const key = `${line.productId}|${line.unitPrice}`;
        let g = map.get(key);
        if (!g) {
          g = { key, label: line.label, unitPrice: line.unitPrice, lines: [] };
          map.set(key, g);
        }
        g.lines.push(line);
      } else {
        plain.push(line);
      }
    }
    return { groups: [...map.values()], plain };
  }, [cart]);

  const totalQuantity = useMemo(() => cart.reduce((sum, line) => sum + line.quantity, 0), [cart]);

  const advanceApplies =
    loadedReservation && loadedReservation.contactId === contactId ? loadedReservation.advance : 0;
  const due = Math.max(0, total - advanceApplies);

  useSaveShortcut(() => {
    void pay();
  }, !submitting && cart.length > 0);

  const showPanel = searching || results.length > 0;

  useEffect(() => {
    if (!showPanel) {
      setPanelPos(null);
      return;
    }
    function update() {
      const rect = searchWrapRef.current?.getBoundingClientRect();
      if (rect) setPanelPos({ top: rect.bottom + 8, left: rect.left, width: rect.width });
    }
    update();
    document.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      document.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [showPanel]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await apiRequest<{ number: string }[]>(`/transaction?type=SALE&limit=1`, { token });
        const last = list?.[0]?.number ?? "";
        const match = last.match(/SAL-(\d+)$/);
        const next = match ? parseInt(match[1], 10) + 1 : 1;
        if (!cancelled) setInvoiceNo(`SAL-${String(next).padStart(4, "0")}`);
      } catch {
        /* keep default */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    function onDown(event: MouseEvent) {
      if (panelPos && !searchWrapRef.current?.contains(event.target as Node)) {
        setResults([]);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [panelPos]);

  const runSearch = useCallback(
    async (term: string): Promise<SearchResult[]> => {
      const query = term.trim();
      if (query.length < 2) {
        setResults([]);
        return [];
      }
      setSearching(true);
      try {
        const found = await apiRequest<SearchResult[]>(
          `/product/search?q=${encodeURIComponent(query)}&statuses=IN_STOCK,RESERVED`,
          { token },
        );
        setResults(found);
        return found;
      } catch {
        setResults([]);
        return [];
      } finally {
        setSearching(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      void runSearch(q);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, runSearch]);

  async function handleSearchEnter() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const found = await runSearch(q);
    if (found.length === 0) return;
    if (found.length > 1) {
      toast("Multiple products — tap one to add", "error");
      return;
    }
    const product = found[0];
    if (product.units.length === 1) {
      if (addLine(product, product.units[0])) {
        toast(`${product.brand} ${product.model} · ${product.units[0].imei} added`, "success");
      }
    } else if (product.units.length === 0) {
      addLine(product);
      toast(`${product.brand} ${product.model} added`, "success");
    } else {
      toast("Multiple units — tap the IMEI", "error");
    }
  }

  function addLine(
    result: SearchResult,
    unit?: { id: string; imei: string; condition?: "NEW" | "USED"; carrier?: "NON_PTA" | "PTA" | "SIM_LOCKED" },
  ): boolean {
    const label = [
      result.brand,
      result.model,
      result.storage,
      result.ram,
      result.screenSize,
      result.color,
      unit?.carrier ? CARRIER_LABELS[unit.carrier] : null,
    ]
      .filter(Boolean)
      .join(" ");
    const key = unit ? `unit-${unit.id}` : `prod-${result.id}`;
    const already = cart.some((l) => l.key === key);
    if (already) {
      if (unit) {
        toast("This IMEI is already in the sale", "error");
        return false;
      }
      setCart((prev) =>
        prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l)),
      );
      return true;
    }
    setCart((prev) => [
      ...prev,
      {
        key,
        productId: result.id,
        label,
        imei: unit?.imei ?? null,
        unitId: unit?.id ?? null,
        unitPrice: parseFloat(result.sellPrice),
        quantity: 1,
        condition: unit?.condition,
        carrier: unit?.carrier ? CARRIER_LABELS[unit.carrier] : undefined,
      },
    ]);
    return true;
  }

  function removeLine(key: string) {
    setCart((prev) => prev.filter((l) => l.key !== key));
  }

  async function openReservationPicker() {
    setReservationPickOpen(true);
    setPickLoading(true);
    try {
      setPickReservations(await apiRequest<ReservationDetail[]>("/reservation?status=ACTIVE", { token }));
    } catch {
      setPickReservations([]);
    } finally {
      setPickLoading(false);
    }
  }

  function loadReservation(reservation: ReservationDetail) {
    setLoadedReservation({
      id: reservation.id,
      number: reservation.number,
      type: reservation.type,
      advance: parseFloat(reservation.advance),
      contactId: reservation.contact.id,
    });
    setContactId(reservation.contact.id);
    setCart(
      reservation.items.map((item) => ({
        key: item.unit ? `unit-${item.unit.id}` : `prod-${item.product.id}`,
        productId: item.product.id,
        label: [
          brandOf(item.product),
          item.product.model,
          item.product.storage,
          item.product.ram,
          item.product.screenSize,
          item.product.color,
        ]
          .filter(Boolean)
          .join(" "),
        imei: item.unit?.imei ?? null,
        unitId: item.unit?.id ?? null,
        unitPrice: parseFloat(item.unitPrice),
        quantity: item.quantity,
      })),
    );
    setQ("");
    setResults([]);
    setReservationPickOpen(false);
    toast(
      reservation.type === "CONSIGNMENT"
        ? `Consignment ${reservation.number} loaded`
        : `Reservation ${reservation.number} loaded`,
      "success",
    );
  }

  async function pay() {
    if (cart.length === 0) {
      toast("Cart is empty", "error");
      return;
    }
    let customerId = contactId;
    if (isWalkIn) {
      const name = walkInName.trim();
      if (!name) {
        toast("Enter a name for the walk-in customer", "error");
        return;
      }
      try {
        const created = await apiRequest<Contact>("/contact", {
          method: "POST",
          token,
          body: { name, phone: walkInPhone.trim() || undefined },
        });
        customerId = created.id;
        void refetchContacts();
        toast(`${created.name} saved as a customer`, "success");
      } catch (err) {
        toast(err instanceof Error ? err.message : "Couldn't save the customer", "error");
        return;
      }
    }
    if (!customerId) {
      toast("Pick a customer (or use walk-in)", "error");
      return;
    }
    let payments: {
      method: "CASH" | "CARD" | "BANK_TRANSFER" | "CREDIT";
      amount: number;
      bankAccountId?: string;
    }[] = [];
    if (mode === "CASH") {
      payments = [{ method: "CASH", amount: parseFloat(cash) || due }];
    } else if (mode === "CARD") {
      payments = [{ method: "CARD", amount: parseFloat(card) || due }];
    } else if (mode === "BANK") {
      const amount = parseFloat(bankAmount) || due;
      if (!bankId) {
        toast("Pick which bank the payment went to", "error");
        return;
      }
      payments = [{ method: "BANK_TRANSFER", amount, bankAccountId: bankId }];
    } else if (mode === "CREDIT") {
      payments = [{ method: "CREDIT", amount: parseFloat(credit) || due }];
    } else {
      const list: {
        method: "CASH" | "CARD" | "BANK_TRANSFER" | "CREDIT";
        amount: number;
        bankAccountId?: string;
      }[] = [];
      for (const row of bankRows) {
        const amount = parseFloat(row.amount) || 0;
        if (amount <= 0) continue;
        if (!row.bankId) {
          toast("Pick which bank the payment went to", "error");
          return;
        }
        list.push({ method: "BANK_TRANSFER", amount, bankAccountId: row.bankId });
      }
      const cashAmt = parseFloat(cash) || 0;
      const cardAmt = parseFloat(card) || 0;
      const creditAmt = parseFloat(credit) || 0;
      if (cashAmt > 0) list.push({ method: "CASH", amount: cashAmt });
      if (cardAmt > 0) list.push({ method: "CARD", amount: cardAmt });
      if (creditAmt > 0) list.push({ method: "CREDIT", amount: creditAmt });
      payments = list;
    }
    payments = payments.filter((p) => p.amount > 0);
    const dueCovered = advanceApplies > 0 && due <= 0.01;
    if (payments.length === 0 && !dueCovered) {
      toast("Enter a payment amount", "error");
      return;
    }
    const sum = payments.reduce((s, p) => s + p.amount, 0);
    if (sum > total + 0.01) {
      toast("Payments exceed the total", "error");
      return;
    }

    const unitIds = cart.filter((l) => l.unitId).map((l) => l.unitId as string);
    if (!confirmedRef.current && unitIds.length > 0) {
      try {
        const found = await apiRequest<ReservationConflict[]>(
          `/reservation/check?unitIds=${encodeURIComponent(unitIds.join(","))}&contactId=${encodeURIComponent(customerId)}`,
          { token },
        );
        if (found.length > 0) {
          setConflicts(found);
          return;
        }
      } catch {
        /* proceed without conflict check */
      }
    }

    setSubmitting(true);
    try {
      const txn = await apiRequest<TransactionDetail>("/transaction/sale", {
        method: "POST",
        token,
        body: {
          contactId: customerId,
          items: cart.map((l) => ({
            productId: l.productId,
            unitId: l.unitId ?? undefined,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
          })),
          payments,
        },
      });
      setReceipt(txn);
      toast(`Sale ${txn.number} completed`, "success");
      const match = invoiceNo.match(/SAL-(\d+)$/);
      const next = match ? parseInt(match[1], 10) + 1 : 1;
      setInvoiceNo(`SAL-${String(next).padStart(4, "0")}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Sale failed", "error");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setReceipt(null);
    confirmedRef.current = false;
    setLoadedReservation(null);
    setCart([]);
    setQ("");
    setResults([]);
    setCash("");
    setCard("");
    setCredit("");
    setBankAmount("");
    setBankRows([]);
    setMode("CASH");
    setWalkInName("");
    setWalkInPhone("");
    setContactId(contacts?.[0]?.id ?? null);
  }

  const contactOptions = [
    {
      value: WALK_IN,
      label: "Walk-in (new)",
      trailing: <span className="text-xs text-ink-400">save as new customer</span>,
    },
    ...(contacts ?? []).map((c) => ({
      value: c.id,
      label: c.name,
      trailing: c.phone ? <span className="text-xs text-ink-400">{c.phone}</span> : null,
    })),
  ];

  const isWalkIn = contactId === WALK_IN;

  const modeOptions = PAYMENT_MODES.map((m) => ({ value: m.value, label: m.label }));

  if (receipt) {
    return (
      <div className="mx-auto max-w-sm">
        <div id="receipt" className="rounded-2xl bg-white p-6 font-mono text-sm">
          <p className="text-center text-lg font-bold">DOST Mobile</p>
          <p className="text-center text-xs">{receipt.number}</p>
          <div className="my-4" />
          <p className="text-xs">{receipt.contact.name}</p>
          <div className="my-4" />
          <div className="space-y-1">
            {receipt.items.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span>
                  {item.product.brand} {item.product.model}
                  {item.unit ? <span className="block text-[10px] text-ink-400">{item.unit.imei}</span> : null}
                </span>
                <span>{formatPKR(item.total)}</span>
              </div>
            ))}
          </div>
          <div className="my-4" />
          <div className="flex justify-between font-bold">
            <span>TOTAL</span>
            <span>{formatPKR(receipt.total)}</span>
          </div>
          {receipt.payments.map((p) => (
            <div key={p.id} className="mt-1 flex justify-between text-xs">
              <span className="uppercase">{p.method.replace("_", " ")}</span>
              <span>{formatPKR(p.amount)}</span>
            </div>
          ))}
          {receipt.status === "PARTIAL" && (
            <p className="mt-3 text-center text-xs font-bold text-amber-600">PARTIAL PAYMENT</p>
          )}
          <p className="mt-4 text-center text-xs text-ink-400">Thank you for shopping with us!</p>
        </div>
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="secondary" onClick={() => window.print()}>
            <PrinterIcon className="h-4 w-4" />
            Print receipt
          </Button>
          <Button onClick={reset}>
            <PlusIcon className="h-4 w-4" />
            New sale
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="flex h-full flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        void pay();
      }}
    >
      <div className="flex shrink-0 items-center justify-end gap-2">
        <Link href="/sale-returns">
          <Button variant="grey">
            <RefundIcon className="h-4 w-4" />
            Sale Return
          </Button>
        </Link>
        <Button variant="grey" onClick={() => void openReservationPicker()}>
          <ReservationIcon className="h-4 w-4" />
          Process Reservation
        </Button>
        <Link href="/reservations">
          <Button>
            <PlusIcon className="h-4 w-4" />
            New Reservation
          </Button>
        </Link>
      </div>

      <div className="mt-4 grid shrink-0 gap-3 md:grid-cols-[2fr_1fr_1fr_1fr] md:items-end">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">Customer</p>
          {contactOptions.length > 0 && (
            <Dropdown
              value={contactId}
              options={contactOptions}
              onChange={setContactId}
              searchable
              trigger={
                <div className="flex items-center justify-between rounded-2xl bg-ink-100 px-4 py-3 text-sm">
                  <span className="truncate text-ink-900">
                    {isWalkIn
                      ? "Walk-in (new)"
                      : (contacts?.find((c) => c.id === contactId)?.name ?? "Select customer")}
                  </span>
                </div>
              }
            />
          )}
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">Invoice #</p>
          <Input value={invoiceNo} readOnly className="bg-ink-100" />
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">Date</p>
          <DatePicker value={saleDate} onChange={setSaleDate} />
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">Payment</p>
          <Dropdown
            value={mode}
            options={modeOptions}
            onChange={(v) => setMode(v as PaymentMode)}
            trigger={
              <div className="flex items-center justify-between rounded-2xl bg-ink-100 px-4 py-3 text-sm">
                <span className="text-ink-900">
                  {PAYMENT_MODES.find((m) => m.value === mode)?.label}
                </span>
              </div>
            }
          />
        </div>
      </div>

      {isWalkIn && (
        <div className="mt-3 grid shrink-0 gap-3 rounded-2xl bg-white p-4 md:grid-cols-2">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">Customer name</p>
            <Input
              value={walkInName}
              onChange={(e) => setWalkInName(e.target.value)}
              placeholder="Enter customer name"
              className="bg-ink-100"
            />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">Phone number</p>
            <Input
              value={walkInPhone}
              onChange={(e) => setWalkInPhone(e.target.value)}
              placeholder="e.g. 0300-1234567"
              inputMode="tel"
              className="bg-ink-100"
            />
          </div>
        </div>
      )}

      <section className="mt-6 shrink-0">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-500">Add items</p>
          <div ref={searchWrapRef} className="relative">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleSearchEnter();
                }
              }}
              placeholder="Scan IMEI or search product…"
              variant="white"
              className="bg-ink-100 py-4 pl-11 text-base rounded-[16px]"
            />

            {panelPos &&
              (searching || (!searching && q.trim().length >= 2 && results.length === 0)) && (
                <div
                  style={{ position: "fixed", top: panelPos.top, left: panelPos.left, width: panelPos.width }}
                  className="z-[100] rounded-2xl bg-white p-4"
                >
                  <p className="text-sm text-ink-400">
                    {searching ? "Searching…" : "No products found."}
                  </p>
                </div>
              )}

            {panelPos && results.length > 0 && (
              <div
                style={{ position: "fixed", top: panelPos.top, left: panelPos.left, width: panelPos.width }}
                className="z-[100] max-h-72 overflow-y-auto overscroll-none rounded-2xl bg-white p-1.5"
              >
                {results.map((result) => {
                  const inStock = result.units;
                  return (
                    <div key={result.id} className="rounded-xl hover:bg-ink-50">
                      <div className="flex items-center justify-between gap-3 px-3 pt-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink-900">
                            {result.brand} {result.model} {result.storage ?? ""} {result.ram ?? ""} {result.screenSize ?? ""} {result.color ?? ""}
                          </p>
                          <p className="text-xs text-ink-500">
                            {formatPKR(result.sellPrice)} · {result.category.name}
                          </p>
                        </div>
                        {inStock.length === 0 ? (
                          cart.some((l) => l.key === `prod-${result.id}`) ? (
                            <button
                              type="button"
                              onClick={() => {
                                removeLine(`prod-${result.id}`);
                                toast(`${result.brand} ${result.model} removed from sale`, "success");
                              }}
                              className="shrink-0 rounded-xl bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-600 hover:bg-brand-100"
                            >
                              ✓ Added
                            </button>
                          ) : (
                            <Button variant="secondary" className="shrink-0 px-3 py-2 text-xs" onClick={() => addLine(result)}>
                              <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
                              Add
                            </Button>
                          )
                        ) : (
                          <span className="shrink-0 text-xs text-ink-400">{inStock.length} unit(s)</span>
                        )}
                      </div>
                      {inStock.length > 0 && (
                        <div className="space-y-1.5 px-1.5 pb-3 pt-1.5">
                          {inStock.map((unit) => {
                            const added = cart.some((l) => l.key === `unit-${unit.id}`);
                            return (
                              <button
                                key={unit.id}
                                type="button"
                                onClick={() => {
                                  if (added) {
                                    removeLine(`unit-${unit.id}`);
                                    toast(`${result.brand} ${result.model} · ${unit.imei.slice(-6)} removed from sale`, "success");
                                  } else {
                                    addLine(result, unit);
                                  }
                                }}
                                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 ${
                                  added ? "bg-brand-50 hover:bg-brand-100" : "bg-ink-50 hover:bg-brand-50"
                                }`}
                              >
                                <span className={`truncate font-mono text-xs ${added ? "text-brand-600" : "text-ink-700"}`}>
                                  {unit.imei}
                                </span>
                                <span className="flex shrink-0 items-center gap-2">
                                  {unit.status === "RESERVED" && (
                                    <Badge variant="warning">Reserved</Badge>
                                  )}
                                  <Badge variant="neutral">{unit.condition}</Badge>
                                  <Badge variant="neutral">{CARRIER_LABELS[unit.carrier]}</Badge>
                                  {added ? (
                                    <span className="text-xs font-semibold text-brand-600">Added</span>
                                  ) : (
                                    <PlusIcon className="h-3.5 w-3.5 text-ink-400" />
                                  )}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
      </section>

      <div className="mt-6 flex-1 overflow-y-auto pt-0.5">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">Sale items</span>
            <span className="text-xs text-ink-500">{totalQuantity} item(s)</span>
          </div>

        <div className="overflow-x-auto rounded-2xl bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ink-500">
                <th className="px-4 py-2.5 font-semibold">Item</th>
                <th className="px-4 py-2.5 text-center font-semibold">Qty</th>
                <th className="px-4 py-2.5 text-right font-semibold">Unit price</th>
                <th className="px-4 py-2.5 text-right font-semibold">Amount</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {cartGroups.groups.map((g) => (
                <Fragment key={g.key}>
                  <tr className="border-y border-ink-100 bg-ink-50/70">
                    <td colSpan={5} className="px-4 py-2">
                      <div className="flex w-full items-center gap-2 text-left">
                        <span className="truncate font-semibold text-ink-900">{g.label}</span>
                        <Badge variant="neutral" className="shrink-0">
                          {g.lines.length} unit{g.lines.length === 1 ? "" : "s"}
                        </Badge>
                      </div>
                    </td>
                  </tr>
                  {g.lines.map((line) => (
                    <tr key={line.key} className="bg-white transition hover:bg-ink-50">
                      <td className="px-4 py-3 pl-8">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-ink-700">{line.imei}</span>
                          {line.condition && <Badge variant="neutral">{line.condition}</Badge>}
                          {line.carrier && <Badge variant="neutral">{line.carrier}</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-ink-700">{line.quantity}</td>
                      <td className="px-4 py-3 text-right text-ink-700">{formatPKR(line.unitPrice)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-ink-900">
                        {formatPKR(line.unitPrice * line.quantity)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" onClick={() => removeLine(line.key)} className="text-ink-400 hover:text-brand-600">
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
              {cartGroups.plain.map((line, i) => (
                <tr key={line.key} className={i % 2 === 0 ? "bg-white" : "bg-ink-50"}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-900">{line.label}</p>
                    <p className="text-[11px] text-ink-400">{`${line.quantity} × ${formatPKR(line.unitPrice)}`}</p>
                  </td>
                  <td className="px-4 py-3 text-center text-ink-700">{line.quantity}</td>
                  <td className="px-4 py-3 text-right text-ink-700">{formatPKR(line.unitPrice)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-ink-900">
                    {formatPKR(line.unitPrice * line.quantity)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => removeLine(line.key)} className="text-ink-400 hover:text-brand-600">
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
              {cart.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-400">
                    Cart is empty — search and add items.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </section>
      </div>

      <div className="-mx-6 -mb-6 mt-6 shrink-0 bg-white px-6 py-4">
        <div className="lg:max-w-xl">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
              {mode === "SPLIT" ? "Split amounts" : "Amount"}
            </p>
            {mode === "BANK" && (
              <div className="mb-2">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Paid into bank
                </p>
                {bankAccounts.length > 0 ? (
                  <Dropdown
                    value={bankId ?? ""}
                    options={bankAccounts.map((b) => ({
                      value: b.id,
                      label: b.bankName,
                      trailing: (
                        <span className="text-xs text-ink-400">
                          {b.name} · {b.accountNo}
                        </span>
                      ),
                    }))}
                    onChange={(v) => setBankId(v)}
                    trigger={
                      <div className="flex items-center justify-between rounded-2xl bg-ink-100 px-4 py-3 text-sm">
                        <span className="truncate text-ink-900">
                          {bankAccounts.find((b) => b.id === bankId)?.bankName ?? "Select bank…"}
                        </span>
                      </div>
                    }
                  />
                ) : (
                  <p className="rounded-2xl bg-ink-100 px-4 py-3 text-xs text-ink-500">
                    No registered bank accounts — add them in Settings.
                  </p>
                )}
              </div>
            )}
            {mode === "SPLIT" ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <Input value={cash} onChange={(e) => setCash(e.target.value)} placeholder="Cash" inputMode="decimal" className="bg-ink-100" />
                  <Input value={card} onChange={(e) => setCard(e.target.value)} placeholder="Card" inputMode="decimal" className="bg-ink-100" />
                  <Input value={credit} onChange={(e) => setCredit(e.target.value)} placeholder="Credit" inputMode="decimal" className="bg-ink-100" />
                </div>
                {bankRows.map((row) => (
                  <div key={row.id} className="mt-2 flex items-center gap-2">
                    <Input
                      value={row.amount}
                      onChange={(e) =>
                        setBankRows((r) =>
                          r.map((x) => (x.id === row.id ? { ...x, amount: e.target.value } : x))
                        )
                      }
                      placeholder="Bank amount"
                      inputMode="decimal"
                      className="w-28 bg-ink-100"
                    />
                    {bankAccounts.length > 0 ? (
                      <Dropdown
                        value={row.bankId}
                        options={bankAccounts
                          .filter((b) => b.id === row.bankId || !bankRows.some((x) => x.id !== row.id && x.bankId === b.id))
                          .map((b) => ({
                            value: b.id,
                            label: b.bankName,
                            trailing: (
                              <span className="text-xs text-ink-400">
                                {b.name} · {b.accountNo}
                              </span>
                            ),
                          }))}
                        onChange={(v) =>
                          setBankRows((r) =>
                            r.map((x) => (x.id === row.id ? { ...x, bankId: v } : x))
                          )
                        }
                        trigger={
                          <div className="flex flex-1 items-center justify-between rounded-2xl bg-ink-100 px-3 py-2.5 text-sm">
                            <span className="truncate text-ink-900">
                              {bankAccounts.find((b) => b.id === row.bankId)?.bankName ??
                                "Pick bank…"}
                            </span>
                          </div>
                        }
                      />
                    ) : (
                      <p className="flex-1 text-xs text-ink-500">
                        No registered bank accounts — add them in Settings.
                      </p>
                    )}
                    <button
                      type="button"
                      aria-label="Remove bank"
                      className="text-ink-400 transition hover:text-ink-900"
                      onClick={() => setBankRows((r) => r.filter((x) => x.id !== row.id))}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </>
            ) : (
              <Input
                value={mode === "CASH" ? cash : mode === "CARD" ? card : mode === "BANK" ? bankAmount : credit}
                onChange={(e) =>
                  mode === "CASH"
                    ? setCash(e.target.value)
                    : mode === "CARD"
                      ? setCard(e.target.value)
                      : mode === "BANK"
                        ? setBankAmount(e.target.value)
                        : setCredit(e.target.value)
                }
                placeholder={formatPKR(due)}
                inputMode="decimal"
                className="bg-ink-100"
              />
            )}
            {mode === "SPLIT" && (
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  className="px-3 py-1.5 text-xs"
                  disabled={bankRows.length >= bankAccounts.length}
                  onClick={() =>
                    setBankRows((r) => {
                      const used = r.map((x) => x.bankId);
                      const next = bankAccounts.find((b) => !used.includes(b.id));
                      return [...r, { id: crypto.randomUUID(), amount: "", bankId: next?.id ?? "" }];
                    })
                  }
                >
                  + Add bank
                </Button>
                <Button
                  variant="secondary"
                  className="px-3 py-1.5 text-xs"
                  onClick={() =>
                    setCash(
                      String(
                        due -
                          (parseFloat(card) || 0) -
                          (parseFloat(credit) || 0) -
                          bankRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
                      )
                    )
                  }
                >
                  Fill remaining as cash
                </Button>
              </div>
            )}
          </div>
          {loadedReservation && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <Badge
                className="rounded-lg px-2 py-1"
                variant={loadedReservation.type === "CONSIGNMENT" ? "info" : "warning"}
              >
                {loadedReservation.number}
              </Badge>
              {loadedReservation.type === "CONSIGNMENT" ? (
                <span className="text-ink-500">
                  Agreed total <span className="font-semibold text-ink-900">{formatPKR(total)}</span>
                </span>
              ) : (
                <>
                  <span className="text-ink-500">
                    Advance{" "}
                    <span className="font-semibold text-ink-900">{formatPKR(loadedReservation.advance)}</span>
                  </span>
                  <span className="text-ink-500">
                    Balance due{" "}
                    <span className="font-semibold text-ink-900">
                      {formatPKR(advanceApplies > 0 ? due : total)}
                    </span>
                  </span>
                </>
              )}
              <button
                type="button"
                onClick={() => setLoadedReservation(null)}
                title="Clear reservation"
                className="rounded-lg p-1 text-ink-400 hover:bg-ink-100 hover:text-red-500"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

      <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-baseline gap-3">
              <span className="text-sm font-medium text-ink-500">Total</span>
              <span className="text-3xl font-bold text-brand-600">{formatPKR(total)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="grey" className="px-4 py-2" onClick={reset}>
              Clear
            </Button>
            <Button
              className="min-w-72 px-8 py-4 text-base"
              type="submit"
              disabled={submitting || cart.length === 0}
            >
              {submitting ? "Processing…" : `Charge ${formatPKR(due)}`}
              <Kbd>Ctrl+S</Kbd>
            </Button>
          </div>
        </div>
      </div>

      <Sheet open={reservationPickOpen} title="Process reservation" onClose={() => setReservationPickOpen(false)}>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto overscroll-none">
          {pickLoading ? (
            <p className="p-4 text-sm text-ink-400">Loading reservations…</p>
          ) : pickReservations?.length === 0 ? (
            <p className="p-4 text-sm text-ink-400">No active reservations.</p>
          ) : (
            (pickReservations ?? []).map((reservation) => (
              <button
                key={reservation.id}
                type="button"
                onClick={() => loadReservation(reservation)}
                className="w-full rounded-xl bg-ink-50 p-3 text-left transition hover:bg-brand-50"
              >
                <p className="text-sm font-semibold text-ink-900">
                  {reservation.number} · {reservation.contact.name}
                  <Badge
                    className="ml-2"
                    variant={reservation.type === "CONSIGNMENT" ? "info" : "warning"}
                  >
                    {reservation.type === "CONSIGNMENT" ? "Out" : "Hold"}
                  </Badge>
                </p>
                <p className="mt-0.5 text-xs text-ink-500">
                  {reservation.type === "CONSIGNMENT"
                    ? `Agreed ${formatPKR(parseFloat(reservation.total))}`
                    : `Total ${formatPKR(parseFloat(reservation.total))} · Advance ${formatPKR(
                        parseFloat(reservation.advance),
                      )} · Due ${formatPKR(
                        Math.max(0, parseFloat(reservation.total) - parseFloat(reservation.advance)),
                      )}`}
                </p>
                <p className="mt-0.5 text-xs text-ink-400">
                  {reservation.items.map((i) =>
                    i.unit ? `${brandOf(i.product)} ${i.product.model} · ${i.unit.imei.slice(-6)}` : `${brandOf(i.product)} ${i.product.model} ×${i.quantity}`,
                  ).join(", ")}
                </p>
              </button>
            ))
          )}
        </div>
      </Sheet>

      <Dialog
        open={conflicts !== null}
        title="Reserved items — different customer"
        message={
          <div className="space-y-3">
            <p>
              These units are reserved for someone else. Selling them to{" "}
              <span className="font-semibold text-ink-900">
                {(contacts?.find((c) => c.id === contactId)?.name ?? "this customer")}
              </span>{" "}
              will complete the reservation(s).
            </p>
            {conflicts?.map((conflict) => (
              <div key={conflict.reservationId} className="rounded-xl bg-amber-50 p-3">
                <p className="text-sm font-semibold text-ink-900">
                  {conflict.reservationNumber} · {conflict.contactName}
                  {conflict.contactPhone ? ` · ${conflict.contactPhone}` : ""}
                </p>
                <p className="mt-0.5 text-xs text-ink-500">
                  Total {formatPKR(parseFloat(conflict.total))} · Advance{" "}
                  {formatPKR(parseFloat(conflict.advance))}
                </p>
                <p className="mt-1 font-mono text-[11px] text-ink-500">
                  {conflict.units.map((u) => u.imei).join(", ")}
                </p>
              </div>
            ))}
          </div>
        }
        confirmLabel="Sell anyway"
        destructive
        onCancel={() => setConflicts(null)}
        onConfirm={() => {
          confirmedRef.current = true;
          setConflicts(null);
          void pay();
        }}
      />
    </form>
  );
}
