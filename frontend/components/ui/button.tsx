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
  md: "px-4 py-2 text-sm",
  sm: "px-2.5 py-1.5 text-xs",
  icon: "p-1.5",
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: keyof typeof SIZES;
  loading?: boolean;
  loadingText?: string;
  children: ReactNode;
};

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  loading = false,
  loadingText,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={(event) => {
        playClick();
        rest.onClick?.(event);
      }}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition disabled:opacity-50 ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {loading && <Spinner />}
      {loading ? (loadingText ?? children) : children}
    </button>
  );
}
