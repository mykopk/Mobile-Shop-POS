"use client";

import type { ReactNode } from "react";
import { SettingsSidebar } from "@/components/settings/settings-sidebar";

export function ToolsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full gap-6">
      <SettingsSidebar activeTab="shop" />
      <main className="min-w-0 flex-1 overflow-y-auto overscroll-none print:p-0">{children}</main>
    </div>
  );
}
