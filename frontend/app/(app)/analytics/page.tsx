"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApi } from "@/lib/use-api";
import type { StockMovement, Transaction } from "@/lib/api-types";
import { formatPKR } from "@/lib/money";
import { pluralize } from "@/lib/pluralize";
import { formatDateTime } from "@/lib/dates";
import { TRANSACTION_TYPE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BadgeVariant } from "@/components/ui/badge";
import { FilterPill } from "@/components/ui/filter-pill";
import { PaginationBar, usePagination } from "@/components/ui/pagination";
import { TransactionDetailModal } from "@/components/transactions/transaction-detail";

type Tab = "overview" | "sales" | "purchases" | "returns" | "stock";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "sales", label: "Sales" },
  { id: "purchases", label: "Purchases" },
  { id: "returns", label: "Returns" },
  { id: "stock", label: "Stock movements" },
];

const TYPE_VARIANT: Record<string, BadgeVariant> = {
  SALE: "success",
  PURCHASE: "info",
  SALE_RETURN: "warning",
  PURCHASE_RETURN: "danger",
};

const MOVE_VARIANT: Record<string, BadgeVariant> = {
  IN: "success",
  OUT: "danger",
  ADJUST: "warning",
  TRANSFER: "info",
  RESERVED: "neutral",
  RELEASED: "brand",
};

function TransactionTable({ rows, onView }: { rows: Transaction[] | null; onView: (id: string) => void }) {
  const list = rows ?? [];
  const { page, pageSize, setPage, setPageSize, pageCount, from, to, slice } = usePagination(list.length);
  const pageItems = slice(list);
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink-500">
              <th className="px-4 py-2.5 font-semibold">Number</th>
              <th className="px-4 py-2.5 font-semibold">Contact</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 text-right font-semibold">Items</th>
              <th className="px-4 py-2.5 text-right font-semibold">Total</th>
              <th className="px-4 py-2.5 text-right font-semibold">Date</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {pageItems.map((t) => (
              <tr key={t.id} className="border-t border-ink-100 hover:bg-ink-50/50">
                <td className="px-4 py-3 font-medium text-ink-900">{t.number}</td>
                <td className="px-4 py-3 text-ink-700">{t.contact.name}</td>
                <td className="px-4 py-3">
                  <Badge variant={TYPE_VARIANT[t.type] ?? "neutral"}>
                    {t.type === "SALE_RETURN" || t.type === "PURCHASE_RETURN" ? TRANSACTION_TYPE_LABELS[t.type] : t.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right text-ink-500">{t._count.items}</td>
                <td className="px-4 py-3 text-right font-medium text-ink-900">{formatPKR(t.total)}</td>
                <td className="px-4 py-3 text-right text-xs text-ink-400">
                  {new Date(t.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onView(t.id)}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-600 transition hover:bg-brand-50"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-sm text-ink-400">
                  Nothing here yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <PaginationBar
        from={from}
        to={to}
        total={list.length}
        page={page}
        pageCount={pageCount}
        pageSize={pageSize}
        onPrev={() => setPage(page - 1)}
        onNext={() => setPage(page + 1)}
        onPageSize={setPageSize}
      />
    </div>
  );
}

function MovementsTable({ movements }: { movements: StockMovement[] | null }) {
  const list = movements ?? [];
  const { page, pageSize, setPage, setPageSize, pageCount, from, to, slice } = usePagination(list.length);
  const pageItems = slice(list);
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink-500">
              <th className="px-4 py-2.5 font-semibold">Type</th>
              <th className="px-4 py-2.5 font-semibold">Product</th>
              <th className="px-4 py-2.5 font-semibold">IMEI</th>
              <th className="px-4 py-2.5 font-semibold">Qty</th>
              <th className="px-4 py-2.5 font-semibold">Note</th>
              <th className="px-4 py-2.5 text-right font-semibold">When</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((m) => (
              <tr key={m.id} className="border-t border-ink-100">
                <td className="px-4 py-3">
                  <Badge variant={MOVE_VARIANT[m.type] ?? "neutral"}>{m.type}</Badge>
                </td>
                <td className="px-4 py-3 text-ink-900">
                  {m.product ? `${m.product.brand} ${m.product.model} ${m.product.storage ?? ""}`.trim() : "—"}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-ink-700">{m.unit?.imei ?? "—"}</td>
                <td className="px-4 py-3 text-ink-700">{m.qty}</td>
                <td className="px-4 py-3 text-ink-500">{m.note ?? ""}</td>
                <td className="px-4 py-3 text-right text-xs text-ink-400">
                  {formatDateTime(m.createdAt)}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-sm text-ink-400">
                  No stock movements recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <PaginationBar
        from={from}
        to={to}
        total={list.length}
        page={page}
        pageCount={pageCount}
        pageSize={pageSize}
        onPrev={() => setPage(page - 1)}
        onNext={() => setPage(page + 1)}
        onPageSize={setPageSize}
      />
    </div>
  );
}

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: sales, refetch: refetchSales } = useApi<Transaction[]>("/transaction?type=SALE&limit=100");
  const { data: purchases, refetch: refetchPurchases } = useApi<Transaction[]>("/transaction?type=PURCHASE&limit=100");
  const { data: saleReturns, refetch: refetchSaleReturns } = useApi<Transaction[]>("/transaction?type=SALE_RETURN&limit=100");
  const { data: purchaseReturns, refetch: refetchPurchaseReturns } = useApi<Transaction[]>("/transaction?type=PURCHASE_RETURN&limit=100");
  const { data: movements, refetch: refetchMovements } = useApi<StockMovement[]>("/unit/movements?limit=100");

  const totals = useMemo(() => {
    const sum = (list: Transaction[] | null) =>
      (list ?? []).reduce((acc, t) => acc + (parseFloat(t.total) || 0), 0);
    const count = (list: Transaction[] | null) => list?.length ?? 0;
    return {
      salesCount: count(sales),
      salesAmount: sum(sales),
      purchasesCount: count(purchases),
      purchasesAmount: sum(purchases),
      saleReturnsCount: count(saleReturns),
      saleReturnsAmount: sum(saleReturns),
      purchaseReturnsCount: count(purchaseReturns),
      purchaseReturnsAmount: sum(purchaseReturns),
      movementsCount: movements?.length ?? 0,
    };
  }, [sales, purchases, saleReturns, purchaseReturns, movements]);

  const returns = useMemo(
    () => [...(saleReturns ?? []), ...(purchaseReturns ?? [])].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
    [saleReturns, purchaseReturns],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-ink-900">Analytics</h2>
          <p className="text-xs text-ink-500">Sales, purchases, returns and stock movements.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/sale-returns">
            <Button variant="secondary" className="px-4 py-2 text-xs">New sale return</Button>
          </Link>
          <Link href="/purchase-returns">
            <Button variant="secondary" className="px-4 py-2 text-xs">New purchase return</Button>
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <FilterPill key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </FilterPill>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pt-0.5">
        {tab === "overview" && (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <SummaryCard label="Sales" value={formatPKR(totals.salesAmount)} sub={pluralize(totals.salesCount, "sale")} />
              <SummaryCard label="Purchases" value={formatPKR(totals.purchasesAmount)} sub={pluralize(totals.purchasesCount, "purchase")} />
              <SummaryCard label="Sale returns" value={formatPKR(totals.saleReturnsAmount)} sub={pluralize(totals.saleReturnsCount, "return")} />
              <SummaryCard label="Purchase returns" value={formatPKR(totals.purchaseReturnsAmount)} sub={pluralize(totals.purchaseReturnsCount, "return")} />
            </div>
            <div className="rounded-2xl bg-white p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Recent returns</p>
              {returns.length === 0 ? (
                <p className="text-sm text-ink-400">No returns yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {returns.slice(0, 8).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedId(t.id)}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-ink-50"
                    >
                      <span className="flex items-center gap-2">
                        <Badge variant={TYPE_VARIANT[t.type] ?? "neutral"}>
                          {t.type === "SALE_RETURN" ? "Sale" : "Purchase"}
                        </Badge>
                        <span className="font-medium text-ink-900">{t.number}</span>
                        <span className="text-xs text-ink-500">{t.contact.name}</span>
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="text-sm font-medium text-ink-900">{formatPKR(t.total)}</span>
                        <span className="text-xs text-ink-400">{new Date(t.createdAt).toLocaleDateString()}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "sales" && <TransactionTable rows={sales} onView={setSelectedId} />}
        {tab === "purchases" && <TransactionTable rows={purchases} onView={setSelectedId} />}
        {tab === "returns" && (
          <div className="space-y-4">
            <TransactionTable rows={saleReturns} onView={setSelectedId} />
            <TransactionTable rows={purchaseReturns} onView={setSelectedId} />
          </div>
        )}

        {tab === "stock" && <MovementsTable movements={movements} />}
      </div>

      {selectedId && (
        <TransactionDetailModal
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={() => {
            refetchSales();
            refetchPurchases();
            refetchSaleReturns();
            refetchPurchaseReturns();
            refetchMovements();
          }}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-ink-900">{value}</p>
      <p className="text-xs text-ink-400">{sub}</p>
    </div>
  );
}
