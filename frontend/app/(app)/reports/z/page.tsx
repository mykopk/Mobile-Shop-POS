"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/apiClient";
import { usePeriodReport } from "@/components/reports/use-period-report";
import { KpiCard } from "@/components/reports/report-card";
import { TopList } from "@/components/reports/top-list";
import { PeriodPicker } from "@/components/reports/period-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { hasPermission } from "@/lib/roles";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { useToast } from "@/components/ui/toast";
import { formatPKR } from "@/lib/money";
import type { CashSession, ZReport } from "@/lib/api-types";

export default function ZReportPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const canOpen = hasPermission(user, PERMISSIONS.cashSessionOpen);
  const canClose = hasPermission(user, PERMISSIONS.cashSessionClose);

  const { data, loading, range, setRange } = usePeriodReport<ZReport>("/report/z");
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [current, setCurrent] = useState<CashSession | null>(null);
  const [openingFloat, setOpeningFloat] = useState("");
  const [countedFloat, setCountedFloat] = useState("");
  const [busy, setBusy] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      const [list, cur] = await Promise.all([
        apiRequest<CashSession[]>("/cash-session"),
        apiRequest<CashSession | null>("/cash-session/current"),
      ]);
      setSessions(list ?? []);
      setCurrent(cur);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  async function openSession() {
    setBusy(true);
    try {
      await apiRequest("/cash-session/open", {
        method: "POST",
        body: { openingFloat: parseFloat(openingFloat) || 0 },
      });
      toast("Cash session opened", "success");
      setOpeningFloat("");
      await loadSessions();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not open session", "error");
    } finally {
      setBusy(false);
    }
  }

  async function closeSession() {
    if (!current) return;
    setBusy(true);
    try {
      await apiRequest(`/cash-session/${current.id}/close`, {
        method: "POST",
        body: { countedFloat: parseFloat(countedFloat) || 0 },
      });
      toast("Cash session closed", "success");
      setCountedFloat("");
      await loadSessions();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not close session", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-ink-900">Z-report / Cash reconciliation</h2>
          <p className="text-xs text-ink-500">
            Cash in drawer vs system. Expected closing = opening float + cash in − cash out.
          </p>
        </div>
        {current ? (
          <span className="shrink-0 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200">
            Session open · {current.number}
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-ink-50 px-3 py-1 text-xs font-semibold text-ink-500 ring-1 ring-ink-200">
            No open session
          </span>
        )}
      </div>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-ink-100">
        {current ? (
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">Counted cash in drawer</p>
              <Input
                value={countedFloat}
                onChange={(e) => setCountedFloat(e.target.value)}
                placeholder="0"
                inputMode="decimal"
                className="w-48 bg-ink-100"
              />
            </div>
            <Button onClick={closeSession} disabled={busy} variant="grey">
              {busy ? "Closing…" : "Close session"}
            </Button>
          </div>
        ) : canOpen ? (
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">Opening float</p>
              <Input
                value={openingFloat}
                onChange={(e) => setOpeningFloat(e.target.value)}
                placeholder="0"
                inputMode="decimal"
                className="w-48 bg-ink-100"
              />
            </div>
            <Button onClick={openSession} disabled={busy}>
              {busy ? "Opening…" : "Open session"}
            </Button>
          </div>
        ) : null}
      </div>

      <PeriodPicker value={range} onChange={setRange} />

      {loading ? (
        <p className="text-sm text-ink-400">Loading…</p>
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Opening float" value={formatPKR(data.openingFloat)} sub="Float at start of day" />
            <KpiCard label="Cash in" value={formatPKR(data.cashIn)} sub="Sales + refunds received + vouchers in" />
            <KpiCard label="Cash out" value={formatPKR(data.cashOut)} sub="Purchases + refunds + vouchers + expenses" />
            <KpiCard label="Expected in drawer" value={formatPKR(data.expectedClosing)} sub="Float + in − out" />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <TopList
              title="Cash in"
              rows={[
                { id: "sale", label: "Cash sales", value: data.saleCash },
                { id: "purret", label: "Purchase refunds received", value: data.purchaseReturnCash },
                { id: "vrin", label: "Cash vouchers received (CRV)", value: data.vouchersIn },
              ]}
              format={formatPKR}
            />
            <TopList
              title="Cash out"
              rows={[
                { id: "pur", label: "Cash purchases", value: data.purchaseCash },
                { id: "salret", label: "Sale refunds paid", value: data.saleReturnCash },
                { id: "vrout", label: "Cash vouchers paid (CPV)", value: data.vouchersOut },
                { id: "exp", label: "Expenses", value: data.expenses },
              ]}
              format={formatPKR}
            />
          </div>
        </>
      ) : null}

      {sessions.length > 0 && (
        <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-ink-100">
          <div className="px-4 py-3 text-sm font-semibold text-ink-900">Session history</div>
          <table className="w-full text-sm">
            <thead className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-2.5">#</th>
                <th className="px-4 py-2.5">Opened</th>
                <th className="px-4 py-2.5 text-right">Float</th>
                <th className="px-4 py-2.5 text-right">Counted</th>
                <th className="px-4 py-2.5 text-right">Variance</th>
                <th className="px-4 py-2.5">Closed by</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const v = s.variance != null ? parseFloat(s.variance) : null;
                return (
                  <tr key={s.id} className="border-b border-ink-50 hover:bg-ink-50/60">
                    <td className="px-4 py-2.5 font-mono text-xs">{s.number}</td>
                    <td className="px-4 py-2.5 text-xs text-ink-500">{new Date(s.openedAt).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right">{formatPKR(s.openingFloat)}</td>
                    <td className="px-4 py-2.5 text-right">{s.countedFloat != null ? formatPKR(s.countedFloat) : "—"}</td>
                    <td className={`px-4 py-2.5 text-right font-medium ${v != null && v < 0 ? "text-error" : v != null && v > 0 ? "text-brand-600" : ""}`}>
                      {v != null ? formatPKR(v) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-ink-500">{s.closedBy?.name ?? "Open"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
