"use client";

import { forwardRef } from "react";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

type Variant = "filled" | "outline" | "white";

const VARIANTS: Record<Variant, string> = {
  filled: "bg-ink-100 placeholder:text-ink-400",
  outline: "bg-white placeholder:text-ink-400",
  white: "bg-white placeholder:text-ink-400",
};

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { variant?: Variant }
>(function Input({ variant = "filled", className = "", ...rest }, ref) {
  return (
    <input
      ref={ref}
      className={`mx-1 h-9 w-[calc(100%-0.5rem)] rounded-2xl px-3.5 text-sm text-ink-900 transition focus:outline-none focus:ring-2 focus:ring-brand-500/60 ${VARIANTS[variant]} ${className}`}
      {...rest}
    />
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { variant?: Variant }
>(function Textarea({ variant = "filled", className = "", rows = 3, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={`mx-1 w-[calc(100%-0.5rem)] resize-none rounded-2xl px-3.5 py-2 text-sm text-ink-900 transition focus:outline-none focus:ring-2 focus:ring-brand-500/60 ${VARIANTS[variant]} ${className}`}
      {...rest}
    />
  );
});
