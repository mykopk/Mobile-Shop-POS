"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
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
    <div className="flex min-h-screen bg-ink-50 text-ink-900">
      <aside className="flex w-60 shrink-0 flex-col bg-white">
        <div className="flex items-center gap-2.5 px-5 py-4">
          <Logo size={32} />
          <div className="leading-tight">
            <p className="text-sm font-bold">
              {APP.name}
              <span className="text-brand-600">{APP.nameSuffix}</span>
            </p>
            <p className="text-[10px] text-ink-500">{APP.storeSub}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-brand-500/10 text-brand-600"
                    : "text-ink-500 hover:bg-ink-100 hover:text-ink-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-4">
          <p className="text-sm font-medium text-ink-900">{user?.name}</p>
          <p className="text-xs capitalize text-ink-500">
            {user?.role.toLowerCase()}
          </p>
          <Button
            variant="grey"
            className="mt-3 w-full"
            onClick={handleLogout}
          >
            {UI.signOut}
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between bg-white/60 px-6">
          <h1 className="text-sm font-semibold text-ink-900">{currentLabel}</h1>
          <span className="text-xs text-ink-500">Today</span>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
