"use client";

import type { ReactNode } from "react";

export function ScrollView({
  children,
  className = "",
  maxHeight = "max-h-72",
}: {
  children: ReactNode;
  className?: string;
  maxHeight?: string;
}) {
  return (
    <div className={`overscroll-none overflow-y-auto ${maxHeight} ${className}`}>
      {children}
    </div>
  );
}
