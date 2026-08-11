import type { ReactNode } from "react";

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="ml-2 inline-flex items-center rounded bg-white/25 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-current">
      {children}
    </kbd>
  );
}
