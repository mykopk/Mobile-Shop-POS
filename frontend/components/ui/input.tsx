"use client";

import type { InputHTMLAttributes } from "react";

type Variant = "filled" | "outline" | "white";

const VARIANTS: Record<Variant, string> = {
  filled: "bg-ink-50 placeholder:text-ink-400",
  outline: "border border-ink-200 bg-white placeholder:text-ink-400",
  white: "bg-white placeholder:text-ink-400",
};

export function Input({
  variant = "filled",
  className = "",
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { variant?: Variant }) {
  return (
    <input
      className={`w-full rounded-2xl px-4 py-3 text-sm text-ink-900 transition focus:outline-none focus:ring-2 focus:ring-brand-500/60 ${VARIANTS[variant]} ${className}`}
      {...rest}
    />
  );
}
