"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/apiClient";
import type { Contact, PurchaseOrder } from "@/lib/api-types";
import { useApi } from "@/lib/use-api";
import { useAuth } from "@/lib/auth-context";
import { hasPermission } from "@/lib/roles";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { formatPKR } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/dropdown";
import { Sheet } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { PlusIcon, RefreshIcon } from "@/components/icons";

const STATUS_VARIANT: Record<string, "neutral" | "warning" | "success" | "danger"> = {
  PENDING: "warning",
  PARTIAL: "neutral",
  RECEIVED: "success",
  CANCELLED: "danger",
};

type Row = { productId: string; label: string; quantity: string; costPrice: string };

export default function PurchaseOrdersPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: contacts } = useApi<Contact[]>("/contact");
  const canCreate = hasPermission(user, PERMISSIONS.purchaseOrderCreate);
  const canReceive = hasPermission(user, PERMISSIONS.purchaseOrderReceive);
  const canCancel = hasPermission(user, PERMISSIONS.purchaseOrderCancel);

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [productId, setProductId] = useState("");
  const [products, setProducts] = useState<{ id: string; label: string }[]>([]);
  const [qty, setQty] = useState("");
  const [cost, setCost] = useState("");
  const [busy, setBusy] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState<PurchaseOrder | null>(null);
  const [receiveQty, setReceiveQty] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiRequest<PurchaseOrder[]>("/purchase-order");
      setOrders(list ?? []);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not load orders", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!createOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await apiRequest<{ id: string; model: string; brand: { name: string } | null; storage: string | null; ram: string | null }[]>("/product");
        if (!cancelled) {
          setProducts(
            (list ?? []).map((p) => ({
              id: p.id,
              label: [p.brand?.name, p.model, p.storage, p.ram].filter(Boolean).join(" "),
            })),
          );
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [createOpen]);

  const vendorOptions = (contacts ?? [])
    .filter((c) => c.type === "VENDOR" || c.type === "BOTH")
    .map((c) => ({ value: c.id, label: c.name, trailing: c.phone ? <span className="text-xs text-ink-400">{c.phone}</span> : null }));
  const productOptions = products.map((p) => ({ value: p.id, label: p.label }));

  function addRow() {
    if (!productId) return;
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setRows((prev) => [
      ...prev,
      { productId, label: product.label, quantity: qty || "1", costPrice: cost || "0" },
    ]);
    setProductId("");
    setQty("");
    setCost("");
  }

  async function createOrder() {
    if (!vendorId) {
      toast("Pick a vendor", "error");
      return;
    }
    if (rows.length === 0) {
      toast("Add at least one item", "error");
      return;
    }
    setBusy(true);
    try {
      await apiRequest("/purchase-order", {
        method: "POST",
        body: {
          contactId: vendorId,
          note: note || undefined,
          items: rows.map((r) => ({
            productId: r.productId,
            quantity: parseInt(r.quantity, 10) || 1,
            costPrice: parseFloat(r.costPrice) || 0,
          })),
        },
      });
      toast("Purchase order created", "success");
      setCreateOpen(false);
      setVendorId(null);
      setRows([]);
      setNote("");
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not create order", "error");
    } finally {
      setBusy(false);
    }
  }

  async function receiveOrder() {
    if (!receiveOpen) return;
    const items = receiveOpen.items
      .map((it) => ({
        itemId: it.id,
        quantity: parseInt(receiveQty[it.id] ?? "", 10),
      }))
      .filter((r) => !Number.isNaN(r.quantity) && r.quantity > 0);
    if (items.length === 0) {
      toast("Enter a quantity to receive", "error");
      return;
    }
    setBusy(true);
    try {
      await apiRequest(`/purchase-order/${receiveOpen.id}/receive`, {
        method: "POST",
        body: { items },
      });
      toast("Order received — stock updated", "success");
      setReceiveOpen(null);
      setReceiveQty({});
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not receive order", "error");
    } finally {
      setBusy(false);
    }
  }

  async function cancelOrder(order: PurchaseOrder) {
    const confirmed = window.confirm(`Cancel order ${order.number}?`);
    if (!confirmed) return;
    setBusy(true);
    try {
      await apiRequest(`/purchase-order/${order.id}/cancel`, { method: "POST" });
      toast("Order cancelled", "success");
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not cancel order", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-ink-900">Purchase Orders</h2>
          <p className="text-xs text-ink-500">Record what you ordered from vendors and receive it into stock.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="grey" onClick={() => void load()}>
            <RefreshIcon className="h-4 w-4" />
          </Button>
          {canCreate && (
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon className="h-4 w-4" />
              New order
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-ink-400">Loading…</p>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-none rounded-2xl bg-white">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-500">
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-ink-50 hover:bg-ink-50/60">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs font-medium text-ink-900">{o.number}</p>
                    <p className="text-[11px] text-ink-400">{new Date(o.createdAt).toLocaleDateString()}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-900">{o.contact.name}</p>
                    {o.contact.phone && <p className="text-[11px] text-ink-400">{o.contact.phone}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-500">
                    {o.items.reduce((s, i) => s + i.quantity, 0)} unit(s)
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-ink-900">{formatPKR(o.total)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[o.status] ?? "neutral"}>{o.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {canReceive && (o.status === "PENDING" || o.status === "PARTIAL") && (
                        <Button variant="secondary" size="sm" onClick={() => setReceiveOpen(o)}>
                          Receive
                        </Button>
                      )}
                      {canCancel && (o.status === "PENDING" || o.status === "PARTIAL") && (
                        <Button variant="grey" size="sm" onClick={() => void cancelOrder(o)}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-ink-400">
                    No purchase orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={createOpen} title="New purchase order" onClose={() => setCreateOpen(false)}>
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">Vendor</p>
            <Dropdown value={vendorId} options={vendorOptions} onChange={setVendorId} searchable placeholder="Select vendor" />
          </div>

          <div className="rounded-2xl bg-ink-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Add item</p>
            <div className="space-y-2">
              <Dropdown value={productId} options={productOptions} onChange={setProductId} searchable placeholder="Select product" />
              <div className="flex gap-2">
                <Input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Qty" inputMode="numeric" className="w-24 bg-white" />
                <Input value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Unit cost" inputMode="decimal" className="flex-1 bg-white" />
                <Button type="button" variant="secondary" onClick={addRow} disabled={!productId}>
                  Add
                </Button>
              </div>
            </div>
            {rows.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {rows.map((r, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm">
                    <span className="truncate font-medium text-ink-900">{r.label}</span>
                    <span className="shrink-0 text-xs text-ink-500">
                      {r.quantity} × {formatPKR(r.costPrice)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">Note</p>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" />
          </div>

          <Button className="w-full" onClick={createOrder} disabled={busy || rows.length === 0}>
            {busy ? "Saving…" : "Create order"}
          </Button>
        </div>
      </Sheet>

      <Sheet open={!!receiveOpen} title={`Receive ${receiveOpen?.number ?? ""}`} onClose={() => setReceiveOpen(null)}>
        <div className="space-y-3">
          {receiveOpen?.items.map((it) => {
            const remaining = it.quantity - it.receivedQuantity;
            return (
              <div key={it.id} className="rounded-2xl bg-ink-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm font-medium text-ink-900">
                    {it.product.brand?.name} {it.product.model} {it.product.storage ?? ""} {it.product.ram ?? ""}
                  </span>
                  <span className="shrink-0 text-xs text-ink-500">{formatPKR(it.costPrice)}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-ink-400">Ordered {it.quantity} · Received {it.receivedQuantity}</span>
                  <Input
                    value={receiveQty[it.id] ?? ""}
                    onChange={(e) => setReceiveQty((p) => ({ ...p, [it.id]: e.target.value }))}
                    placeholder={`Receive (max ${remaining})`}
                    inputMode="numeric"
                    className="ml-auto w-28 bg-white"
                  />
                </div>
              </div>
            );
          })}
          <Button className="w-full" onClick={receiveOrder} disabled={busy}>
            {busy ? "Receiving…" : "Receive into stock"}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
