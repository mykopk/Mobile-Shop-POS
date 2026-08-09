"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export type DropdownOption<T extends string = string> = {
  value: T;
  label: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  disabled?: boolean;
};

export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  trigger,
  direction = "down",
  align = "left",
  className = "",
  menuClassName = "",
}: {
  value: T | null;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  trigger: ReactNode | ((open: boolean) => ReactNode);
  direction?: "down" | "up";
  align?: "left" | "right";
  className?: string;
  menuClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        className="block w-full"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {typeof trigger === "function" ? trigger(open) : trigger}
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute z-20 max-h-64 w-full overflow-y-auto rounded-xl bg-white py-1 shadow-[0_16px_40px_-16px_rgba(12,10,9,0.3)] ${
            direction === "up" ? "bottom-full mb-2" : "top-full mt-2"
          } ${align === "right" ? "right-0" : "left-0"} ${menuClassName}`}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={option.disabled}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                  isSelected ? "bg-brand-50" : "hover:bg-ink-50"
                } ${option.disabled ? "opacity-40" : ""}`}
              >
                {option.leading}
                <span className="min-w-0 flex-1 truncate text-sm text-ink-900">
                  {option.label}
                </span>
                {isSelected ? (
                  <span className="shrink-0 text-sm font-bold text-brand-600">
                    ✓
                  </span>
                ) : (
                  option.trailing
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
