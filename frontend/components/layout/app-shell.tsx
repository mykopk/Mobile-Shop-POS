"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { NAV_ICONS } from "@/components/icons";
import { LogoutIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { APP, NAV_ITEMS, UI } from "@/lib/constants";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  const currentLabel =
    NAV_ITEMS.find((item) => pathname.startsWith(item.href))?.label ?? APP.short;

  return (
    <div className="flex h-screen overflow-hidden bg-ink-50 text-ink-900">
      <aside className="flex w-52 shrink-0 flex-col overflow-y-auto overscroll-none bg-white print:hidden">
        <div className="flex items-center gap-2.5 px-4 py-4">
          <Logo size={34} />
          <div className="leading-tight">
            <p className="text-sm font-bold">
              {APP.name}
              <span className="text-brand-600">{APP.nameSuffix}</span>
            </p>
            <p className="text-[10px] text-ink-500">{APP.storeSub}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-3">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = NAV_ICONS[item.icon];
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-brand-50 text-brand-600"
                    : "text-ink-500 hover:bg-ink-100 hover:text-ink-900"
                }`}
              >
                <Icon className={active ? "text-brand-600" : "text-ink-400 group-hover:text-ink-600"} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-sm font-bold text-brand-600">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold text-ink-900">{user?.name}</p>
              <p className="text-xs capitalize text-ink-500">{user?.role.toLowerCase()}</p>
            </div>
            <button
              onClick={handleLogout}
              title={UI.signOut}
              className="ml-auto rounded-xl p-2 text-ink-400 transition hover:bg-ink-100 hover:text-brand-600"
            >
              <LogoutIcon />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between bg-white/70 px-6 print:hidden">
          <h1 className="text-sm font-semibold text-ink-900">{currentLabel}</h1>
          <span className="text-xs text-ink-500">
            {new Date().toLocaleDateString("en-PK", {
              weekday: "long",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </header>
        <main className="flex-1 overflow-y-auto overscroll-none p-6 print:p-0">{children}</main>
      </div>
    </div>
  );
}
