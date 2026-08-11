"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { ChevronDownIcon } from "@/components/icons";

export type DropdownOption<T extends string = string> = {
  value: T;
  label: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  disabled?: boolean;
};

function matchOptions<T extends string>(options: DropdownOption<T>[], query: string) {
  const q = query.toLowerCase();
  for (let len = q.length; len >= 1; len--) {
    const sub = q.slice(-len);
    const hit = options.filter((o) => o.label.toLowerCase().includes(sub));
    if (hit.length > 0) return hit;
  }
  return [];
}

export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  trigger,
  direction = "auto",
  align = "left",
  searchable = false,
  allowCustom = false,
  className = "",
  menuClassName = "",
}: {
  value: T | null;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  trigger: ReactNode | ((open: boolean) => ReactNode);
  direction?: "up" | "down" | "auto";
  align?: "left" | "right";
  searchable?: boolean;
  allowCustom?: boolean;
  className?: string;
  menuClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [filter, setFilter] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    if (direction === "up") {
      setOpenUp(true);
    } else if (direction === "down") {
      setOpenUp(false);
    } else {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        const below = window.innerHeight - rect.bottom;
        const above = rect.top;
        const menuHeight = Math.min(options.length * 46 + 16, 256);
        setOpenUp(below < menuHeight && above > below);
      } else {
        setOpenUp(false);
      }
    }
    setFilter("");
    setOpen(true);
  }

  const visible = searchable && filter
    ? matchOptions(options, filter)
    : options;

  const exactMatch = allowCustom && filter
    ? options.some((o) => o.label.toLowerCase() === filter.toLowerCase())
    : true;

  function chooseCustom() {
    if (!filter.trim()) return;
    onChange(filter.trim() as T);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        className="relative block w-full"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {typeof trigger === "function" ? trigger(open) : trigger}
        <ChevronDownIcon
          className={`pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute z-20 w-full rounded-2xl bg-white p-1.5 shadow-lg shadow-ink-900/5 ${
            openUp ? "bottom-full mb-2" : "top-full mt-2"
          } ${align === "right" ? "right-0" : "left-0"} ${menuClassName}`}
        >
          {searchable && (
            <div className="p-1.5 pb-2.5">
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (visible.length > 0) {
                      onChange(visible[0].value);
                      setOpen(false);
                    } else if (allowCustom) {
                      chooseCustom();
                    } else {
                      setOpen(false);
                    }
                  }
                }}
                placeholder="Search…"
                autoFocus
                className="bg-ink-50"
              />
            </div>
          )}
          <div className="max-h-56 space-y-1 overflow-y-auto overscroll-none">
            {visible.length === 0 ? (
              <p className="px-4 py-3 text-sm text-ink-400">No matches</p>
            ) : (
              visible.map((option) => {
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
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
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
              }              )
            )}
            {allowCustom && filter.trim() && !exactMatch && (
              <button
                type="button"
                onClick={chooseCustom}
                className="flex w-full items-center gap-3 rounded-2xl bg-brand-50 px-3 py-3 text-left font-semibold text-brand-700 transition hover:bg-brand-100"
              >
                <span className="min-w-0 flex-1 truncate text-sm">
                  + Use “{filter.trim()}”
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
