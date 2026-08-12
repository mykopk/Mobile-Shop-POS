"use client";

import { useRef } from "react";
import type { RefObject } from "react";

export function OtpInput({
  length,
  value,
  onChange,
  disabled = false,
  inputRef,
}: {
  length: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  const internalRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? internalRef;

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
        autoFocus
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
            className={`flex h-16 w-14 items-center justify-center rounded-2xl text-2xl font-bold transition ${
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
