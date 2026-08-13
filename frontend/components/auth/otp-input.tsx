"use client";

import { useRef } from "react";
import type { RefObject } from "react";

export function OtpInput({
  length,
  value,
  onChange,
  disabled = false,
  inputRef,
  autoFocus = true,
  size = "lg",
}: {
  length: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  autoFocus?: boolean;
  size?: "sm" | "lg";
}) {
  const internalRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? internalRef;

  const boxClass =
    size === "sm"
      ? "h-11 w-9 rounded-xl text-lg"
      : "h-16 w-14 rounded-2xl text-2xl";

  return (
    <div
      className="relative flex cursor-text justify-center gap-3"
      onClick={() => ref.current?.focus()}
      role="group"
      aria-label="PIN entry"
    >
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        name=""
        data-1p-ignore
        data-lpignore="true"
        data-form-type="other"
        autoFocus={autoFocus}
        value={value}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "").slice(0, length);
          onChange(digits);
        }}
        disabled={disabled}
        className="absolute inset-0 h-full w-full cursor-text opacity-0"
      />
      {Array.from({ length }).map((_, i) => {
        const isFilled = i < value.length;
        const isActive = i === value.length;
        return (
          <span
            key={i}
            className={`flex items-center justify-center font-bold transition ${boxClass} ${
              isFilled
                ? "bg-brand-600 text-white"
                : "bg-ink-50 text-ink-900"
            } ${isActive ? "ring-2 ring-brand-600" : ""}`}
          >
            {isFilled ? "•" : ""}
          </span>
        );
      })}
    </div>
  );
}
