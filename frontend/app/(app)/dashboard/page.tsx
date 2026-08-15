"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartPieIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InventoryIcon,
  PosIcon,
  ProductsIcon,
  PurchasesIcon,
  RefundIcon,
  ReportsIcon,
  ReservationIcon,
  ReturnsIcon,
  TrendingUpIcon,
  UserIcon,
  VoucherIcon,
  WalletIcon,
} from "@/components/icons";
import { useAuth } from "@/lib/auth-context";
import type { ActivityLog, CompanyProfile, DashboardOverview, DashboardWidget, ReportRange } from "@/lib/api-types";
import { useApi } from "@/lib/use-api";
import { canViewCosts } from "@/lib/roles";
import { formatMoney, formatMoneyCompact } from "@/lib/money";
import { pluralize } from "@/lib/pluralize";
import { toISODate } from "@/lib/dates";
import { apiRequest } from "@/lib/apiClient";
import { CHART } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { PeriodPicker } from "@/components/reports/period-picker";
import { ACTIVITY_ACTION_LABELS, TRANSACTION_TYPE_LABELS } from "@/lib/constants";
import {
  DASHBOARD_WIDGETS,
  DASHBOARD_WIDGET_SPANS,
  DEFAULT_DASHBOARD_WIDGETS,
  type DashboardWidgetKey,
} from "@/lib/constants/dashboard";

function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-3xl bg-white ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4">
          {title && <h3 className="text-sm font-semibold text-ink-900">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function KpiCard({ label, value, sub, tone, icon }: {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
  icon?: ComponentType<{ className?: string }>;
}) {
  const Icon = icon;
  return (
    <div className="rounded-3xl bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
        {Icon && <span className="rounded-xl bg-brand-50 p-1.5 text-brand-600"><Icon className="h-4 w-4" /></span>}
      </div>
      <p className={`mt-2 text-2xl font-bold ${tone ?? "text-ink-900"}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-400">{sub}</p>}
    </div>
  );
}

const SHORTCUTS = [
  { href: "/pos", label: "New Sale", icon: PosIcon },
  { href: "/purchases", label: "Buy New", icon: PurchasesIcon },
  { href: "/products", label: "Add Product", icon: ProductsIcon },
  { href: "/contacts", label: "Add Customer", icon: UserIcon },
  { href: "/inventory", label: "Inventory", icon: InventoryIcon },
  { href: "/reports", label: "Reports", icon: ReportsIcon },
];

function ChartTooltip({ active, payload, label, money, percent, noHeader, symbol = "Rs" }: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string | number;
  money?: boolean;
  percent?: boolean;
  noHeader?: boolean;
  symbol?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const total = payload.reduce((sum, p) => sum + (p.value ?? 0), 0);
  const labelText =
    typeof label === "string" && /^\d{4}-\d{2}-\d{2}$/.test(label)
      ? new Date(label).toLocaleDateString("en-PK", { day: "numeric", month: "short" })
      : String(label ?? "");
  return (
    <div className="min-w-36 rounded-2xl bg-white px-3.5 py-3">
      {!noHeader && labelText && (
        <p className="mb-2 pb-2 text-xs font-semibold uppercase tracking-wide text-ink-900">
          {labelText}
        </p>
      )}
      <div className="space-y-1.5">
        {payload.map((p) => (
          <div key={p.name} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-1.5 text-xs text-ink-500">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
              {p.name}
            </span>
            <span className="text-xs font-semibold text-ink-900">
              {money ? formatMoney(p.value, symbol) : p.value}
              {percent && total > 0 ? ` · ${Math.round(((p.value ?? 0) / total) * 100)}%` : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AxisTick({ x, y, payload, today }: {
  x?: number | string;
  y?: number | string;
  payload?: { value?: string };
  today?: boolean;
}) {
  return (
    <text
      x={x}
      y={Number(y ?? 0) + 4}
      textAnchor="middle"
      fontSize={11}
      fontWeight={today ? 700 : 400}
      fill={today ? CHART.sales : CHART.ink}
    >
      {new Date(payload?.value ?? "").toLocaleDateString("en-PK", { weekday: "short" })}
    </text>
  );
}

function TodayDot({ cx, cy, payload, todayKey }: {
  cx?: number;
  cy?: number;
  payload?: { day?: string };
  todayKey?: string;
}) {
  if (!payload || payload.day !== todayKey) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill={CHART.sales} opacity={0.18} />
      <circle cx={cx} cy={cy} r={3.5} fill={CHART.sales} stroke="#fff" strokeWidth={2} />
    </g>
  );
}

function actionLabel(action: string) {
  return (
    ACTIVITY_ACTION_LABELS[action] ??
    action
      .split(".").pop()
      ?.toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()) ??
    action
  );
}

function entityLabel(entity: string) {
  return entity.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short" });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [range, setRange] = useState<ReportRange>(() => {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 13);
    return { from: toISODate(from), to: toISODate(to) };
  });
  const [visibleKeys, setVisibleKeys] = useState<DashboardWidgetKey[]>(DEFAULT_DASHBOARD_WIDGETS);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const widgetsLoadedRef = useRef(false);

  const params = new URLSearchParams();
  if (range.from) params.set("from", range.from);
  if (range.to) params.set("to", range.to);
  const qs = params.toString();
  const overviewPath = qs ? `/dashboard/overview?${qs}` : "/dashboard/overview";
  const { data, loading } = useApi<DashboardOverview>(overviewPath);
  const { data: activity } = useApi<ActivityLog[]>("/dashboard/activity");
  const { data: profile } = useApi<CompanyProfile>("/settings/company");
  const { data: savedWidgets } = useApi<DashboardWidget[]>("/dashboard/widgets");

  useEffect(() => {
    if (!savedWidgets || widgetsLoadedRef.current) return;
    widgetsLoadedRef.current = true;
    if (savedWidgets.length > 0) {
      const saved = savedWidgets
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((w) => w.key as DashboardWidgetKey)
        .filter((k) => DASHBOARD_WIDGETS.some((w) => w.key === k));
      if (saved.length > 0) setVisibleKeys(saved);
    }
  }, [savedWidgets]);

  const currencySymbol = profile?.currencySymbol ?? "Rs";
  const compact = profile?.compactPrices ?? true;
  const fmt = (n: number | string) => {
    const sym = currencySymbol;
    return compact ? formatMoneyCompact(n, sym) : formatMoney(n, sym);
  };

  const viewCosts = canViewCosts(user);

  const rangeLabel = useMemo(() => {
    if (!range.from && !range.to) return "All time";
    const fmtDate = (iso: string) =>
      new Date(`${iso}T00:00:00`).toLocaleDateString("en-PK", { day: "numeric", month: "short" });
    if (range.from && range.to && range.from !== range.to) {
      return `${fmtDate(range.from)} – ${fmtDate(range.to)}`;
    }
    return "Today";
  }, [range]);

  const paymentData = data
    ? [
        { name: "Cash", value: data.paymentSplit.CASH, color: CHART.cash },
        { name: "Card", value: data.paymentSplit.CARD, color: CHART.card },
        { name: "Bank", value: data.paymentSplit.BANK_TRANSFER, color: CHART.transfer },
        { name: "Credit", value: data.paymentSplit.CREDIT, color: CHART.credit },
      ].filter((p) => p.value > 0)
    : [];

  const newUsedData = data
    ? [
        { name: "New", value: data.newUsedSold.NEW, color: CHART.new },
        { name: "Used", value: data.newUsedSold.USED, color: CHART.used },
      ]
    : [];

  const trendData = data
    ? data.salesTrend.map((d, i) => ({
        day: d.key,
        Sales: d.revenue,
        ...(viewCosts && data.profitTrend ? { Profit: data.profitTrend[i] ?? 0 } : {}),
      }))
    : [];
  const todayKey = trendData.length > 0 ? trendData[trendData.length - 1].day : "";

  const carrierData = data
    ? [
        { name: "PTA", value: data.carrierSplit.PTA, color: CHART.pta },
        { name: "Non-PTA", value: data.carrierSplit.NON_PTA, color: CHART.nonPta },
        { name: "SIM locked", value: data.carrierSplit.SIM_LOCKED, color: CHART.simLocked },
      ].filter((c) => c.value > 0)
    : [];
  const carrierTotal = carrierData.reduce((sum, c) => sum + c.value, 0);

  const soldTotal = data
    ? data.soldByCategory.PHONE + data.soldByCategory.ACCESSORY
    : 0;
  const netCash = data ? data.today.cashIn - data.today.cashOut : 0;

  function toggleWidget(key: DashboardWidgetKey) {
    setVisibleKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  function moveWidget(key: DashboardWidgetKey, dir: -1 | 1) {
    setVisibleKeys((prev) => {
      const i = prev.indexOf(key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function saveLayout() {
    setSaving(true);
    try {
      await apiRequest("/dashboard/widgets", {
        method: "PUT",
        body: {
          widgets: visibleKeys.map((key, order) => ({
            key,
            order,
            layout: DASHBOARD_WIDGET_SPANS[key],
            settings: "{}",
          })),
        },
      });
      toast("Dashboard layout saved", "success");
      setCustomizeOpen(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't save the layout", "error");
    } finally {
      setSaving(false);
    }
  }

  function widgetBlock(key: DashboardWidgetKey, children: ReactNode) {
    return (
      <div key={key} className={DASHBOARD_WIDGET_SPANS[key]}>
        {children}
      </div>
    );
  }

  function renderWidget(key: DashboardWidgetKey) {
    switch (key) {
      case "kpis":
        return widgetBlock(
          "kpis",
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              label="Today's Sales"
              value={loading || !data ? "…" : fmt(data.today.revenue)}
              sub={loading || !data ? undefined : pluralize(data.today.salesCount, "invoice")}
              tone="text-brand-600"
              icon={WalletIcon}
            />
            {viewCosts ? (
              <KpiCard
                label="Net Profit"
                value={loading || !data || data.today.profit === null ? "…" : fmt(data.today.profit)}
                tone="text-warning"
                icon={TrendingUpIcon}
              />
            ) : (
              <KpiCard
                label="Purchases Today"
                value={loading || !data ? "…" : fmt(data.today.purchasesAmount)}
                icon={PurchasesIcon}
              />
            )}
            <KpiCard
              label="Units In Stock"
              value={loading || !data ? "…" : String(data.stock.total)}
              sub={loading || !data ? undefined : `${data.stock.NEW} new · ${data.stock.USED} used`}
              icon={InventoryIcon}
            />
            <KpiCard
              label="Total Revenue"
              value={loading || !data ? "…" : fmt(data.all.revenue)}
              sub={loading || !data ? undefined : `${data.all.salesCount} sales`}
              icon={ChartPieIcon}
            />
          </div>,
        );
      case "kpis2":
        return widgetBlock(
          "kpis2",
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
            <KpiCard
              label="Expenses Today"
              value={loading || !data ? "…" : fmt(data.today.expensesAmount)}
              sub={loading || !data ? undefined : pluralize(data.today.expensesCount, "expense")}
              icon={WalletIcon}
            />
            <KpiCard
              label="Net Cash Today"
              value={loading || !data ? "…" : fmt(netCash)}
              sub={
                loading || !data
                  ? undefined
                  : `${fmt(data.today.cashIn)} in · ${fmt(data.today.cashOut)} out`
              }
              tone={
                loading || !data || netCash >= 0 ? "text-success" : "text-error"
              }
              icon={VoucherIcon}
            />
            <KpiCard
              label="Outstanding Credit"
              value={loading || !data ? "…" : fmt(data.credit.receivables)}
              sub={
                loading || !data
                  ? undefined
                  : data.credit.payables > 0
                    ? `Payables ${fmt(data.credit.payables)}`
                    : undefined
              }
              icon={RefundIcon}
            />
            <KpiCard
              label="Active Reservations"
              value={loading || !data ? "…" : String(data.reservations.active)}
              sub={
                loading || !data
                  ? undefined
                  : `${pluralize(data.reservations.consignments, "consignment")} · ${fmt(data.reservations.advance)} advance`
              }
              icon={ReservationIcon}
            />
            <KpiCard
              label="Inventory Value"
              value={loading || !data ? "…" : fmt(data.stockValue.retail)}
              sub={
                loading || !data || data.stockValue.cost === null
                  ? undefined
                  : `${fmt(data.stockValue.cost)} cost`
              }
              icon={InventoryIcon}
            />
            <KpiCard
              label="Returns Today"
              value={
                loading || !data
                  ? "…"
                  : String(data.today.returns.sale + data.today.returns.purchase)
              }
              sub={
                loading || !data
                  ? undefined
                  : `${pluralize(data.today.returns.sale, "sale")} · ${pluralize(data.today.returns.purchase, "purchase")}`
              }
              icon={ReturnsIcon}
            />
          </div>,
        );
      case "salesTrend":
        return widgetBlock(
          "salesTrend",
          <Card title="Sales trend" action={<span className="text-xs text-ink-400">{rangeLabel}</span>}>
            <div className="h-64 px-2 pb-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tick={(props) => (
                      <AxisTick {...props} today={props?.payload?.value === todayKey} />
                    )}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={70}
                    tick={{ fontSize: 11, fill: CHART.ink }}
                    tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                  />
                  <Tooltip content={<ChartTooltip money symbol={currencySymbol} />} cursor={{ stroke: CHART.ink, strokeWidth: 1, strokeDasharray: "3 3" }} />
                  <ReferenceLine x={todayKey} stroke={CHART.sales} strokeDasharray="4 4" strokeOpacity={0.5} />
                  <Line
                    type="monotone"
                    dataKey="Sales"
                    stroke={CHART.sales}
                    strokeWidth={2.5}
                    dot={<TodayDot todayKey={todayKey} />}
                    activeDot={{ r: 4.5, stroke: "#fff", strokeWidth: 2 }}
                  />
                  {viewCosts && (
                    <Line
                      type="monotone"
                      dataKey="Profit"
                      stroke={CHART.profit}
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      dot={false}
                      activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>,
        );
      case "payments":
        return widgetBlock(
          "payments",
          <Card title="Payments by method">
            <div className="h-64 px-2 pb-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={78} paddingAngle={2}>
                    {paymentData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip money percent noHeader symbol={currencySymbol} />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 px-5 pb-4">
              {paymentData.map((p) => (
                <span key={p.name} className="flex items-center gap-1.5 text-xs text-ink-500">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.name}
                </span>
              ))}
            </div>
          </Card>,
        );
      case "topProducts":
        return widgetBlock(
          "topProducts",
          <Card title="Top products">
            <div className="h-56 px-2 pb-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(data?.topProducts ?? []).map((p) => ({ name: p.name, Units: p.qty }))} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
                  <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: CHART.ink }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={150} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: CHART.ink }} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(230,59,32,0.06)" }} />
                  <Bar dataKey="Units" fill={CHART.sales} radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>,
        );
      case "newUsed":
        return widgetBlock(
          "newUsed",
          <Card title="Sold · New vs Used">
            <div className="h-40 px-2 pb-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={newUsedData} dataKey="value" nameKey="name" innerRadius={44} outerRadius={66} paddingAngle={2}>
                    {newUsedData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip percent noHeader />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-3 px-5 pb-4">
              {newUsedData.map((p) => (
                <span key={p.name} className="flex items-center gap-1.5 text-xs text-ink-500">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.name} · {p.value}
                </span>
              ))}
            </div>
          </Card>,
        );
      case "recentActivity":
        return widgetBlock(
          "recentActivity",
          <Card title="Recent activity">
            {!activity ? (
              <p className="px-5 pb-5 text-sm text-ink-400">Loading…</p>
            ) : activity.length > 0 ? (
              <ul className="">
                {activity.slice(0, 6).map((a) => (
                  <li key={a.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-ink-900">{actionLabel(a.action)}</p>
                      <p className="text-xs text-ink-500">
                        {a.user.name} · {entityLabel(a.entity)}
                      </p>
                    </div>
                    <p className="shrink-0 pl-3 text-xs text-ink-400">{timeAgo(a.createdAt)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 pb-5 text-sm text-ink-400">No recent activity.</p>
            )}
          </Card>,
        );
      case "stockPta":
        return widgetBlock(
          "stockPta",
          <Card title="Stock · PTA status">
            {loading || !data ? (
              <p className="px-5 pb-5 text-sm text-ink-400">Loading…</p>
            ) : carrierTotal > 0 ? (
              <div className="px-5 pb-5 pt-1">
                <div className="flex h-3 overflow-hidden rounded-full bg-ink-100">
                  {carrierData.map((c) => (
                    <div
                      key={c.name}
                      style={{ width: `${(c.value / carrierTotal) * 100}%` }}
                      className="h-full"
                      title={c.name}
                    />
                  ))}
                </div>
                <ul className="mt-3 space-y-1.5">
                  {carrierData.map((c) => (
                    <li key={c.name} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-ink-600">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.name}
                      </span>
                      <span className="font-semibold text-ink-900">{c.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="px-5 pb-5 text-sm text-ink-400">No units in stock.</p>
            )}
          </Card>,
        );
      case "topSellers":
        return widgetBlock(
          "topSellers",
          <Card title="Top sellers">
            {loading || !data ? (
              <p className="px-5 pb-5 text-sm text-ink-400">Loading…</p>
            ) : data.topSellers.length > 0 ? (
              <ul className="px-5">
                {data.topSellers.map((s, i) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="flex min-w-0 items-center gap-2.5 text-ink-700">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[10px] font-bold text-brand-600">
                        {i + 1}
                      </span>
                      <span className="truncate">{s.name}</span>
                    </span>
                    <span className="shrink-0 font-semibold text-ink-900">{fmt(s.revenue)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 pb-5 text-sm text-ink-400">No sales in this period.</p>
            )}
          </Card>,
        );
      case "soldCategory":
        return widgetBlock(
          "soldCategory",
          <Card
            title="Sold · Phones vs Accessories"
            action={<span className="text-xs text-ink-400">{rangeLabel}</span>}
          >
            {loading || !data ? (
              <p className="px-5 pb-5 text-sm text-ink-400">Loading…</p>
            ) : soldTotal > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-4 px-5 pb-3">
                  <div className="rounded-3xl bg-brand-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Phones</p>
                    <p className="mt-1 text-2xl font-bold text-ink-900">{data.soldByCategory.PHONE}</p>
                  </div>
                  <div className="rounded-3xl bg-ink-100 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Accessories</p>
                    <p className="mt-1 text-2xl font-bold text-ink-900">{data.soldByCategory.ACCESSORY}</p>
                  </div>
                </div>
                <div className="mx-5 flex h-3 overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-full bg-brand-500"
                    style={{ width: `${(data.soldByCategory.PHONE / soldTotal) * 100}%` }}
                  />
                  <div
                    className="h-full bg-ink-400"
                    style={{ width: `${(data.soldByCategory.ACCESSORY / soldTotal) * 100}%` }}
                  />
                </div>
                <div className="flex justify-center gap-4 px-5 pb-4 pt-3">
                  <span className="flex items-center gap-1.5 text-xs text-ink-500">
                    <span className="h-2 w-2 rounded-full bg-brand-500" />
                    Phones · {data.soldByCategory.PHONE}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-ink-500">
                    <span className="h-2 w-2 rounded-full bg-ink-400" />
                    Accessories · {data.soldByCategory.ACCESSORY}
                  </span>
                </div>
              </>
            ) : (
              <p className="px-5 pb-5 text-sm text-ink-400">No units sold yet.</p>
            )}
          </Card>,
        );
      case "lowStock":
        return widgetBlock(
          "lowStock",
          data && data.lowStock.length > 0 ? (
            <Card title="Low stock">
              <ul className=" px-5">
                {data.lowStock.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="text-ink-700">
                      {p.brand} {p.model} {p.storage ?? ""}
                    </span>
                    <span className="font-semibold text-warning">{p.inStock} left</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null,
        );
      case "recentTransactions": {
        const lowStockVisible = visibleKeys.includes("lowStock");
        return (
          <div key={key} className={lowStockVisible ? "lg:col-span-2" : "lg:col-span-3"}>
            <Card
              title="Recent transactions"
              action={
                <Link href="/reports" className="text-xs font-medium text-brand-600 hover:underline">
                  View all
                </Link>
              }
            >
              {loading ? (
                <p className="px-5 pb-5 text-sm text-ink-400">Loading…</p>
              ) : data && data.recent.length > 0 ? (
                <ul className="">
                  {data.recent.map((t) => (
                    <li key={t.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm font-medium text-ink-900">
                          {t.number}
                          <Badge className="ml-2" variant="neutral">{TRANSACTION_TYPE_LABELS[t.type] ?? t.type}</Badge>
                        </p>
                        <p className="text-xs text-ink-500">
                          {t.contact.name} · {t.user.name}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-ink-900">{fmt(t.total)}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 pb-5 text-sm text-ink-400">No transactions yet.</p>
              )}
            </Card>
          </div>
        );
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-500">Welcome back, {user?.name}.</p>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodPicker value={range} onChange={setRange} />
          <Button variant="grey" onClick={() => setCustomizeOpen(true)}>
            Customize
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {SHORTCUTS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="flex flex-col items-center gap-2 rounded-3xl bg-white px-3 py-4 text-center transition hover:bg-brand-50"
          >
            <span className="rounded-xl bg-brand-50 p-2 text-brand-600">
              <s.icon className="h-5 w-5" />
            </span>
            <span className="text-xs font-medium text-ink-700">{s.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {visibleKeys.map((key) => renderWidget(key))}
      </div>

      <Sheet
        open={customizeOpen}
        title="Customize dashboard"
        width="max-w-lg"
        onClose={() => setCustomizeOpen(false)}
      >
        <p className="mb-3 text-xs text-ink-400">
          Show, hide and reorder widgets. Changes apply to your account only.
        </p>
        <div className="max-h-[50vh] space-y-1.5 overflow-y-auto overscroll-none">
          {DASHBOARD_WIDGETS.map((w) => {
            const idx = visibleKeys.indexOf(w.key);
            const visible = idx >= 0;
            return (
              <div
                key={w.key}
                className={`flex items-center justify-between gap-3 rounded-2xl p-2.5 ${visible ? "bg-ink-50" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => toggleWidget(w.key)}
                  className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
                >
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      visible ? "border-brand-600 bg-brand-600 text-white" : "border-ink-300 bg-white"
                    }`}
                  >
                    {visible && <CheckIcon className="h-3 w-3" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink-900">{w.label}</span>
                    <span className="block text-xs text-ink-400">{w.description}</span>
                  </span>
                </button>
                {visible && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      aria-label="Move up"
                      disabled={idx === 0}
                      onClick={() => moveWidget(w.key, -1)}
                      className="rounded-lg p-1.5 text-ink-500 transition hover:bg-ink-100 hover:text-ink-900 disabled:opacity-30"
                    >
                      <ChevronUpIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Move down"
                      disabled={idx === visibleKeys.length - 1}
                      onClick={() => moveWidget(w.key, 1)}
                      className="rounded-lg p-1.5 text-ink-500 transition hover:bg-ink-100 hover:text-ink-900 disabled:opacity-30"
                    >
                      <ChevronDownIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button variant="grey" onClick={() => setVisibleKeys([...DEFAULT_DASHBOARD_WIDGETS])}>
            Reset
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="grey" onClick={() => setCustomizeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveLayout()} disabled={saving}>
              {saving ? "Saving…" : "Save layout"}
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
