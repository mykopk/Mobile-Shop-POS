"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { REPORT_NAV } from "@/lib/constants";

export function ReportNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const items = REPORT_NAV.filter(
    (i) => !i.adminOnly || user?.role === "ADMIN" || user?.role === "MANAGER",
  );

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
              active
                ? "bg-brand-600 text-white shadow-sm shadow-brand-600/25"
                : "bg-white text-ink-500 hover:bg-brand-50"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
