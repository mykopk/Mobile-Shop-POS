import type { ReactNode } from "react";

export function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
        active
          ? "bg-brand-600 text-white shadow-sm shadow-brand-600/25"
          : "bg-white text-ink-500 hover:bg-brand-50"
      }`}
    >
      {children}
    </button>
  );
}
