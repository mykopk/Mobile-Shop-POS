"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { MoreIcon } from "@/components/icons";

export type ContextMenuItem = {
  label: string;
  leading?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
};

type MenuPos = { top: number; left: number; width: number } | null;

export function ContextMenu({
  items,
  trigger,
  align = "right",
  direction = "auto",
  ariaLabel = "Actions",
  className = "",
  menuClassName = "",
}: {
  items: ContextMenuItem[];
  trigger?: ReactNode | ((open: boolean) => ReactNode);
  align?: "left" | "right";
  direction?: "up" | "down" | "auto";
  ariaLabel?: string;
  className?: string;
  menuClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [pos, setPos] = useState<MenuPos>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listId = `ctx-menu-${useId().replace(/:/g, "")}`;

  const measure = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuEl = menuRef.current;
    const menuHeight = menuEl?.offsetHeight ?? Math.min(items.length * 46 + 16, 256);
    const below = window.innerHeight - rect.bottom;
    const above = rect.top;
    const shouldOpenUp =
      direction === "up"
        ? true
        : direction === "down"
          ? false
          : below < menuHeight && above > below;
    const width = Math.max(menuEl?.offsetWidth ?? rect.width, 176);
    const left = align === "right" ? rect.right - width : rect.left;
    let top = shouldOpenUp ? rect.top - menuHeight - 4 : rect.bottom + 4;
    top = Math.max(8, Math.min(top, window.innerHeight - menuHeight - 8));
    const clampedLeft = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    setOpenUp(shouldOpenUp);
    setPos({ top, left: clampedLeft, width });
  }, [align, direction, items.length]);

  const menuRefCallback = useCallback(
    (node: HTMLDivElement | null) => {
      menuRef.current = node;
      if (node) {
        measure();
      }
    },
    [measure],
  );

  useEffect(() => {
    if (!open) return;
    measure();
    function onResize() {
      measure();
    }
    function onScroll() {
      measure();
    }
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, measure]);

  useLayoutEffect(() => {
    if (open && menuRef.current) measure();
  }, [open, measure, items]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
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
    setOpen((v) => !v);
  }

  const menu = open && pos ? (
    <div
      ref={menuRefCallback}
      id={listId}
      role="menu"
      aria-label={ariaLabel}
      style={{ top: pos.top, left: pos.left, width: pos.width }}
      className={`fixed z-50 min-w-44 rounded-2xl bg-white p-1.5 shadow-lg shadow-ink-900/5 ${menuClassName}`}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          disabled={item.disabled}
          onClick={() => {
            setOpen(false);
            item.onClick();
          }}
          className={`flex w-full items-center gap-3 rounded-[14px] px-3 py-2 text-left text-sm transition ${
            item.danger ? "text-error hover:bg-error/10" : "text-ink-900 hover:bg-ink-50"
          } ${item.disabled ? "opacity-40" : ""}`}
        >
          {item.leading}
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? listId : undefined}
        className="block rounded-xl p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-600"
      >
        {trigger !== undefined ? (
          typeof trigger === "function" ? trigger(open) : trigger
        ) : (
          <MoreIcon className="h-4 w-4" />
        )}
      </button>

      {menu && createPortal(menu, document.body)}
    </div>
  );
}
