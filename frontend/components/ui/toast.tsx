"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { playError, playSuccess } from "@/lib/sound";
import { TOAST } from "@/lib/constants";

type ToastType = "success" | "error";

type ToastAction = {
  label: string;
  onClick: () => void;
};

type Toast = {
  id: number;
  message: string;
  type: ToastType;
  count: number;
  action?: ToastAction;
};

type ToastContextValue = {
  toast: (message: string, type?: ToastType, duration?: number, action?: ToastAction) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastsRef = useRef<Toast[]>([]);
  const timersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => {
      const next = prev.filter((t) => t.id !== id);
      toastsRef.current = next;
      return next;
    });
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "success", duration?: number, action?: ToastAction) => {
      if (type === "success") playSuccess();
      else playError();
      const ms = duration ?? TOAST.durationMs;
      const existing = toastsRef.current.find(
        (t) => t.message === message && t.type === type,
      );
      if (existing) {
        setToasts((prev) => {
          const next = prev.map((t) =>
            t.id === existing.id ? { ...t, count: t.count + 1 } : t,
          );
          toastsRef.current = next;
          return next;
        });
        const timer = timersRef.current.get(existing.id);
        if (timer) clearTimeout(timer);
        timersRef.current.set(
          existing.id,
          setTimeout(() => dismiss(existing.id), ms),
        );
        return;
      }
      const id = nextId++;
      setToasts((prev) => {
        const next = [...prev, { id, message, type, count: 1, action }].slice(
          -TOAST.maxVisible,
        );
        toastsRef.current = next;
        return next;
      });
      timersRef.current.set(
        id,
        setTimeout(() => dismiss(id), ms),
      );
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[200] flex flex-col items-end gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="toast-in pointer-events-auto flex items-center gap-2.5 rounded-2xl bg-ink-900 px-4 py-3 text-sm font-medium text-ink-50"
          >
            <span
              className={
                t.type === "error" ? "text-brand-500" : "text-brand-400"
              }
            >
              {t.type === "error" ? "✕" : "✓"}
            </span>
            {t.count > 1 && (
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-bold">
                {t.count}x
              </span>
            )}
            {t.message}
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
                className="rounded-lg bg-white/15 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-white/25"
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
