"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { playClick } from "@/lib/sound";

type Variant = "primary" | "secondary" | "grey" | "destructive" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700",
  secondary: "bg-brand-50 text-brand-600 hover:bg-brand-100",
  grey: "bg-ink-100 text-ink-700 hover:bg-ink-200",
  destructive: "bg-red-600 text-white hover:bg-red-700",
  ghost: "bg-white text-ink-700 hover:bg-ink-50",
};

const SIZES = {
  md: "px-5 py-3 text-sm",
  sm: "px-3 py-2 text-xs",
  icon: "p-2",
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: keyof typeof SIZES;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={(event) => {
        playClick();
        rest.onClick?.(event);
      }}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition disabled:opacity-50 ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
