"use client";

import { useAuth } from "@/lib/auth-context";
import { DASHBOARD_KPIS, DASHBOARD_PLACEHOLDERS } from "@/lib/constants";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Welcome back, {user?.name}</h2>
        <p className="mt-1 text-sm text-ink-500">
          Here&apos;s your store at a glance.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {DASHBOARD_KPIS.map((kpi) => (
          <div key={kpi.label} className="rounded-xl bg-white p-4">
            <p className="text-xs text-ink-500">{kpi.label}</p>
            <p className="mt-1.5 text-2xl font-bold text-ink-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {DASHBOARD_PLACEHOLDERS.map((placeholder) => (
          <div
            key={placeholder}
            className="flex h-56 items-center justify-center rounded-xl bg-white text-sm text-ink-400"
          >
            {placeholder}
          </div>
        ))}
      </div>
    </div>
  );
}
