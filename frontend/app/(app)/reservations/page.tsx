"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/apiClient";
import { useAuth } from "@/lib/auth-context";
import { brandOf, type Contact, type ReservationDetail } from "@/lib/api-types";
import { useApi } from "@/lib/use-api";
import { CARRIER_LABELS } from "@/lib/constants";
import { formatPKR } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/dropdown";
import { Kbd } from "@/components/ui/kbd";
import { useToast } from "@/components/ui/toast";
import { useSaveShortcut } from "@/lib/use-save-shortcut";
import { ChevronLeftIcon, PlusIcon, PrinterIcon, ReservationIcon, SearchIcon, SmartphoneIcon, XIcon } from "@/components/icons";

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
  units: { id: string; imei: string; condition: "NEW" | "USED"; carrier: "NON_PTA" | "PTA" | "SIM_LOCKED" }[];
};

type CartLine = {
  key: string;
  productId: string;
  label: string;
  imei: string | null;
  unitId: string | null;
  unitPrice: number;
  quantity: number;
};

const WALK_IN = "__walk_in__";

function ReservationsToolbar() {
  return (
    <div className="flex shrink-0 items-center justify-end gap-2">
      <Link href="/reservations/all">
        <Button variant="grey">
          <ReservationIcon className="h-4 w-4" />
          All Reservations
        </Button>
      </Link>
      <Link href="/reservations/cancel">
        <Button variant="grey">
          <XIcon className="h-4 w-4" />
          Cancel Reservation
        </Button>
      </Link>
    </div>
  );
}

export default function ReservationsPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const { data: contacts, refetch: refetchContacts } = useApi<Contact[]>("/contact");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [contactId, setContactId] = useState<string | null>(null);
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");
  const [advance, setAdvance] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [reserveNo, setReserveNo] = useState("RES-0001");
  const [flow, setFlow] = useState<"RESERVATION" | "CONSIGNMENT" | null>(null);

  function pickFlow(f: "RESERVATION" | "CONSIGNMENT") {
    setAdvance("");
    setFlow(f);
  }
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const total = useMemo(
    () => cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
    [cart],
  );

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
        const list = await apiRequest<ReservationDetail[]>(`/reservation`, { token });
        const last = list?.[0]?.number ?? "";
        const match = last.match(/RES-(\d+)$/);
        const next = match ? parseInt(match[1], 10) + 1 : 1;
        if (!cancelled) setReserveNo(`RES-${String(next).padStart(4, "0")}`);
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
          `/product/search?q=${encodeURIComponent(query)}`,
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

  function addLine(result: SearchResult, unit?: { id: string; imei: string; carrier?: "NON_PTA" | "PTA" | "SIM_LOCKED" }): boolean {
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
        toast("This IMEI is already reserved", "error");
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
      },
    ]);
    return true;
  }

  function removeLine(key: string) {
    setCart((prev) => prev.filter((l) => l.key !== key));
  }

  function setLinePrice(key: string, value: string) {
    setCart((prev) => prev.map((l) => (l.key === key ? { ...l, unitPrice: parseFloat(value) || 0 } : l)));
  }

  async function reserve() {
    if (cart.length === 0) {
      toast("Cart is empty", "error");
      return;
    }
    if (flow === "CONSIGNMENT" && cart.some((l) => !l.unitId)) {
      toast("Pick a specific phone (IMEI) for consignment", "error");
      return;
    }
    const advanceAmount = flow === "RESERVATION" ? (advance === "" ? 0 : parseFloat(advance)) : 0;
    if (Number.isNaN(advanceAmount) || advanceAmount < 0) {
      toast("Enter a valid advance amount (0 for none)", "error");
      return;
    }
    if (advanceAmount > total + 0.01) {
      toast("Advance cannot exceed the total", "error");
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

    setSubmitting(true);
    try {
      const created = await apiRequest<ReservationDetail>("/reservation", {
        method: "POST",
        token,
        body: {
          contactId: customerId,
          type: flow,
          items: cart.map((l) => ({
            productId: l.productId,
            unitId: l.unitId ?? undefined,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
          })),
          advance: advanceAmount,
        },
      });
      setReservation(created);
      toast(`Reservation ${created.number} created`, "success");
      const match = reserveNo.match(/RES-(\d+)$/);
      const next = match ? parseInt(match[1], 10) + 1 : 1;
      setReserveNo(`RES-${String(next).padStart(4, "0")}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Reservation failed", "error");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setReservation(null);
    setCart([]);
    setQ("");
    setResults([]);
    setAdvance("");
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
  const balanceDue = total - (advance === "" ? 0 : parseFloat(advance) || 0);

  useSaveShortcut(() => {
    void reserve();
  }, !submitting && cart.length > 0);

  if (reservation) {
    return (
      <div className="flex h-full flex-col">
        <ReservationsToolbar />
        <div className="mx-auto mt-4 max-w-sm">
        <div className="rounded-2xl bg-white p-6 font-mono text-sm">
          <p className="text-center text-lg font-bold">DOST Mobile</p>
          <p className="text-center text-xs">{reservation.number}</p>
          <Badge
            variant={reservation.type === "CONSIGNMENT" ? "info" : "warning"}
            className="mt-4 w-full justify-center rounded-lg px-2 py-1"
          >
            {reservation.type === "CONSIGNMENT"
              ? `ON CONSIGNMENT — OUT WITH ${reservation.contact.name.toUpperCase()}`
              : "RESERVED — advance collected"}
          </Badge>
          <div className="my-4" />
          <p className="text-xs">{reservation.contact.name}</p>
          <div className="my-4" />
          <div className="space-y-1">
            {reservation.items.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span>
                  {brandOf(item.product)} {item.product.model}
                  {item.unit ? <span className="block text-[10px] text-ink-400">{item.unit.imei}</span> : null}
                </span>
                <span>{formatPKR(item.total)}</span>
              </div>
            ))}
          </div>
          <div className="my-4" />
          <div className="flex justify-between font-bold">
            <span>{reservation.type === "CONSIGNMENT" ? "AGREED TOTAL" : "TOTAL"}</span>
            <span>{formatPKR(reservation.total)}</span>
          </div>
          {reservation.type === "RESERVATION" && (
            <>
              <div className="flex justify-between text-xs">
                <span>Advance</span>
                <span>{formatPKR(parseFloat(reservation.advance))}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold">
                <span>Balance due</span>
                <span>{formatPKR(parseFloat(reservation.total) - parseFloat(reservation.advance))}</span>
              </div>
            </>
          )}
          <p className="mt-4 text-center text-xs text-ink-400">
            {reservation.type === "CONSIGNMENT"
              ? "Collect payment when it sells, or return it to stock if it comes back."
              : "Collect the balance on pickup to complete the sale."}
          </p>
        </div>
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="secondary" onClick={() => window.print()}>
            <PrinterIcon className="h-4 w-4" />
            Print
          </Button>
          <Button onClick={reset}>
            <PlusIcon className="h-4 w-4" />
            New reservation
          </Button>
        </div>
        </div>
      </div>
    );
  }

  if (!flow) {
    const options = [
      {
        f: "RESERVATION" as const,
        icon: <ReservationIcon className="h-8 w-8 text-white" />,
        title: "Hold at Shop",
        desc: "Customer pays an advance now and collects the phone later",
        featured: true,
      },
      {
        f: "CONSIGNMENT" as const,
        icon: <SmartphoneIcon className="h-8 w-8 text-white" />,
        title: "Send on Consignment",
        desc: "Another shopkeeper takes the phone out — collect payment when it sells, or take it back",
        accent: "bg-ink-800",
      },
    ];
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-full max-w-2xl">
          <p className="mb-8 text-center text-sm font-semibold uppercase tracking-wide text-ink-500">
            What are you creating?
          </p>
          <div className="grid gap-5 md:grid-cols-2">
            {options.map((o) =>
              o.featured ? (
                <button
                  key={o.f}
                  type="button"
                  onClick={() => pickFlow(o.f)}
                  className="flex flex-col items-center justify-center gap-4 rounded-3xl bg-brand-600 p-8 text-center transition hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-xl hover:shadow-brand-600/25"
                >
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
                    {o.icon}
                  </span>
                  <span className="text-lg font-bold text-white">{o.title}</span>
                  <span className="text-sm text-brand-50">{o.desc}</span>
                </button>
              ) : (
                <button
                  key={o.f}
                  type="button"
                  onClick={() => pickFlow(o.f)}
                  className="flex flex-col items-center justify-center gap-3 rounded-3xl bg-white p-6 text-center transition hover:-translate-y-0.5 hover:bg-ink-50 hover:shadow-lg hover:shadow-ink-900/5"
                >
                  <span className={`flex h-16 w-16 items-center justify-center rounded-2xl ${o.accent}`}>
                    {o.icon}
                  </span>
                  <span className="text-base font-semibold text-ink-900">{o.title}</span>
                  <span className="text-xs text-ink-500">{o.desc}</span>
                </button>
              ),
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      className="flex h-full flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        void reserve();
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setFlow(null)}
          className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-ink-500 hover:text-ink-900"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          {flow === "CONSIGNMENT" ? "Send on Consignment" : "Hold at Shop"}
        </button>
        <ReservationsToolbar />
      </div>

      <div className="mt-3 grid shrink-0 gap-3 md:grid-cols-[2fr_1fr_1fr] md:items-end">
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
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">Reservation #</p>
          <Input value={reserveNo} readOnly className="bg-ink-100" />
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
            {flow === "CONSIGNMENT" ? "Agreed payment" : "Advance (Rs)"}
          </p>
          {flow === "CONSIGNMENT" ? (
            <p className="rounded-2xl bg-sky-50 px-4 py-3 text-xs font-medium text-sky-700">
              Phone leaves the shop — collect payment when it sells.
            </p>
          ) : (
            <Input
              value={advance}
              onChange={(e) => setAdvance(e.target.value)}
              placeholder="0 = nothing paid"
              inputMode="numeric"
              className="bg-ink-100"
            />
          )}
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
                                toast(`${result.brand} ${result.model} removed from reservation`, "success");
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
                                    toast(`${result.brand} ${result.model} · ${unit.imei.slice(-6)} removed from reservation`, "success");
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
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">Reserved items</span>
            <span className="text-xs text-ink-500">{cart.length} line(s)</span>
          </div>

        <div className="overflow-x-auto rounded-2xl bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ink-500">
                <th className="px-4 py-2.5 font-semibold">Item</th>
                <th className="px-4 py-2.5 text-center font-semibold">Qty</th>
                <th className="px-4 py-2.5 text-right font-semibold">
                  {flow === "CONSIGNMENT" ? "Agreed price" : "Unit price"}
                </th>
                <th className="px-4 py-2.5 text-right font-semibold">Amount</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {cart.map((line, i) => (
                <tr key={line.key} className={i % 2 === 0 ? "bg-white" : "bg-ink-50"}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-900">{line.label}</p>
                    <p className="text-[11px] text-ink-400">
                      {line.imei ?? `${line.quantity} × ${formatPKR(line.unitPrice)}`}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center text-ink-700">{line.quantity}</td>
                  <td className="px-4 py-3 text-right">
                    {flow === "CONSIGNMENT" ? (
                      <Input
                        value={String(line.unitPrice)}
                        onChange={(e) => setLinePrice(line.key, e.target.value)}
                        inputMode="numeric"
                        className="ml-auto w-28 bg-ink-50 text-right"
                      />
                    ) : (
                      <span className="text-ink-700">{formatPKR(line.unitPrice)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-ink-900">
                    {formatPKR(line.unitPrice * line.quantity)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => removeLine(line.key)} className="text-ink-400 hover:text-red-500">
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </section>
      </div>

      <div className="-mx-6 -mb-6 mt-6 shrink-0 bg-white px-6 py-4">
        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-baseline gap-3">
              <span className="text-sm font-medium text-ink-500">
                {flow === "CONSIGNMENT" ? "Agreed total" : "Total"}
              </span>
              <span className="text-3xl font-bold text-brand-600">{formatPKR(total)}</span>
            </div>
            {flow === "RESERVATION" && advance !== "" && !Number.isNaN(parseFloat(advance)) && (
              <div className="flex items-baseline gap-2 text-sm">
                <span className="text-ink-500">Advance</span>
                <span className="font-semibold text-ink-900">{formatPKR(parseFloat(advance) || 0)}</span>
                <span className="text-ink-500">· Due</span>
                <span className="font-semibold text-ink-900">{formatPKR(Math.max(0, balanceDue))}</span>
              </div>
            )}
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
              {submitting
                ? "Saving…"
                : flow === "CONSIGNMENT"
                  ? `Consign ${formatPKR(total)}`
                  : `Reserve ${formatPKR(total)}`}
              <Kbd>Ctrl+S</Kbd>
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
