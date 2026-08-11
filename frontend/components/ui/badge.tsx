import type { ReactNode } from "react";

const VARIANTS = {
  neutral: "bg-brand-50 text-brand-700",
  muted: "bg-brand-100 text-brand-700",
  success: "bg-brand-50 text-brand-700",
  warning: "bg-brand-100 text-brand-700",
  danger: "bg-brand-600 text-white",
  info: "bg-brand-50 text-brand-700",
  brand: "bg-brand-50 text-brand-700",
  violet: "bg-brand-100 text-brand-700",
  blue: "bg-brand-50 text-brand-700",
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
