"use client";

import type { ComponentType } from "react";
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
import { ContactsIcon, InventoryIcon, PosIcon, ProductsIcon, PurchasesIcon, ReportsIcon } from "@/components/icons";
import { ChartPieIcon, TrendingUpIcon, WalletIcon } from "@/components/icons";
import { useAuth } from "@/lib/auth-context";
import type { DashboardOverview } from "@/lib/api-types";
import { useApi } from "@/lib/use-api";
import { canViewCosts } from "@/lib/roles";
import { formatPKR } from "@/lib/money";
import { CHART } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { TRANSACTION_TYPE_LABELS } from "@/lib/constants";

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
    <div className={`rounded-2xl bg-white ${className}`}>
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
    <div className="rounded-2xl bg-white p-5">
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
  { href: "/contacts", label: "Add Customer", icon: ContactsIcon },
  { href: "/inventory", label: "Inventory", icon: InventoryIcon },
  { href: "/reports", label: "Reports", icon: ReportsIcon },
];

function ChartTooltip({ active, payload, label, money, percent, noHeader }: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string | number;
  money?: boolean;
  percent?: boolean;
  noHeader?: boolean;
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
              {money ? formatPKR(p.value) : p.value}
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

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, loading } = useApi<DashboardOverview>("/dashboard/overview");

  const viewCosts = canViewCosts(user?.role);

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
    ? data.sales14d.map((d, i) => ({
        day: d.key,
        Sales: d.revenue,
        ...(viewCosts && data.profitTrend ? { Profit: data.profitTrend[i] ?? 0 } : {}),
      }))
    : [];
  const todayKey = trendData.length > 0 ? trendData[trendData.length - 1].day : "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500">Welcome back, {user?.name}.</p>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {SHORTCUTS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="flex flex-col items-center gap-2 rounded-2xl bg-white px-3 py-4 text-center transition hover:bg-brand-50"
          >
            <span className="rounded-xl bg-brand-50 p-2 text-brand-600">
              <s.icon className="h-5 w-5" />
            </span>
            <span className="text-xs font-medium text-ink-700">{s.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Today's Sales"
          value={loading || !data ? "…" : formatPKR(data.today.revenue)}
          sub={loading || !data ? undefined : `${data.today.salesCount} invoice(s)`}
          tone="text-brand-600"
          icon={WalletIcon}
        />
        {viewCosts ? (
          <KpiCard
            label="Today's Profit"
            value={loading || !data || data.today.profit === null ? "…" : formatPKR(data.today.profit)}
            tone="text-amber-600"
            icon={TrendingUpIcon}
          />
        ) : (
          <KpiCard
            label="Purchases Today"
            value={loading || !data ? "…" : formatPKR(data.today.purchasesAmount)}
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
          value={loading || !data ? "…" : formatPKR(data.all.revenue)}
          sub={loading || !data ? undefined : `${data.all.salesCount} sales`}
          icon={ChartPieIcon}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Sales trend" action={<span className="text-xs text-ink-400">Last 14 days</span>} className="lg:col-span-2">
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
                <Tooltip content={<ChartTooltip money />} cursor={{ stroke: CHART.ink, strokeWidth: 1, strokeDasharray: "3 3" }} />
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
        </Card>

        <Card title="Payments by method">
          <div className="h-64 px-2 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={paymentData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={78} paddingAngle={2}>
                  {paymentData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip money percent noHeader />} />
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
        </Card>

        <Card title="Top products" className="lg:col-span-2">
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
        </Card>

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
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {data && data.lowStock.length > 0 && (
          <Card title="Low stock">
            <ul className=" px-5">
              {data.lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-ink-700">
                    {p.brand} {p.model} {p.storage ?? ""}
                  </span>
                  <span className="font-semibold text-amber-600">{p.inStock} left</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card
          title="Recent transactions"
          action={
            <Link href="/reports" className="text-xs font-medium text-brand-600 hover:underline">
              View all
            </Link>
          }
          className={data && data.lowStock.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}
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
                  <p className="text-sm font-semibold text-ink-900">{formatPKR(t.total)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 pb-5 text-sm text-ink-400">No transactions yet.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
