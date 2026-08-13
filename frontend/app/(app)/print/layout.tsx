import type { ReactNode } from "react";
import { ToolsLayout } from "@/components/layout/tools-layout";

export default function PrintLayout({ children }: { children: ReactNode }) {
  return <ToolsLayout>{children}</ToolsLayout>;
}
