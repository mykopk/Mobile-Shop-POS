import type { ReactNode } from "react";

const VARIANTS = {
  neutral: "bg-ink-100 text-ink-700",
  muted: "bg-ink-200 text-ink-500",
  success: "bg-brand-50 text-brand-700",
  warning: "bg-brand-100 text-brand-700",
  danger: "bg-brand-600 text-white",
  info: "bg-brand-300 text-brand-900",
  brand: "bg-brand-600 text-white",
  violet: "bg-ink-900 text-white",
  blue: "bg-ink-800 text-white",
  brandSolid: "bg-brand-600 text-white",
} as const;

export type BadgeVariant = keyof typeof VARIANTS;

export function Badge({
  variant = "neutral",
  className,
  children,
}: {
  variant?: BadgeVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${VARIANTS[variant]} ${className ?? ""}`}
    >
      {children}
    </span>
  );
}
