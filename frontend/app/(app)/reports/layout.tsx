"use client";

import type { ReactNode } from "react";
import { ReportsSidebar } from "@/components/reports/reports-sidebar";

export default function ReportsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full gap-6">
      <ReportsSidebar />
      <main className="min-w-0 flex-1 overflow-y-auto overscroll-none">{children}</main>
    </div>
  );
}
