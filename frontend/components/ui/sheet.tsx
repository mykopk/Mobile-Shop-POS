"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function Sheet({
  open,
  title,
  onClose,
  children,
  showClose = true,
  width = "max-w-md",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  showClose?: boolean;
  width?: string;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4">
      <div className={`w-full ${width} rounded-2xl bg-white p-3`}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-ink-900">{title}</h3>
          {showClose && (
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
