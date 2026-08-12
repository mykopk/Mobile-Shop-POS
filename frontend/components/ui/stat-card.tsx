import type { ReactNode } from "react";

type StatVariant = "brand" | "grey" | "white";

const VARIANT_STYLES: Record<StatVariant, { card: string; label: string; value: string }> = {
  brand: { card: "bg-brand-50", label: "text-brand-700", value: "text-brand-700" },
  grey: { card: "bg-ink-100", label: "text-ink-500", value: "text-ink-700" },
  white: { card: "bg-white", label: "text-ink-500", value: "text-ink-900" },
};

export function StatCard({
  label,
  value,
  variant = "white",
  valueClassName = "",
}: {
  label: string;
  value: ReactNode;
  variant?: StatVariant;
  valueClassName?: string;
}) {
  const styles = VARIANT_STYLES[variant];
  return (
    <div className={`rounded-2xl px-4 py-3 ${styles.card}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${styles.label}`}>{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${valueClassName || styles.value}`}>{value}</p>
    </div>
  );
}
