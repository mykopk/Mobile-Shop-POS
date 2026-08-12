"use client";

import { useCallback, useRef, useState } from "react";

export function useDirtyForm<T extends object>(initial: T) {
  const baseline = useRef(JSON.stringify(initial));
  const [dirty, setDirty] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pendingClose = useRef<(() => void) | null>(null);

  const markDirty = useCallback((value: T) => {
    setDirty(JSON.stringify(value) !== baseline.current);
  }, []);

  const reset = useCallback((value: T) => {
    baseline.current = JSON.stringify(value);
    setDirty(false);
  }, []);

  const requestClose = useCallback((onClose: () => void) => {
    if (dirty) {
      pendingClose.current = onClose;
      setConfirmOpen(true);
    } else {
      onClose();
    }
  }, [dirty]);

  const confirmDiscard = useCallback(() => {
    setConfirmOpen(false);
    pendingClose.current?.();
    pendingClose.current = null;
  }, []);

  const cancelDiscard = useCallback(() => {
    setConfirmOpen(false);
    pendingClose.current = null;
  }, []);

  return { dirty, confirmOpen, markDirty, reset, requestClose, confirmDiscard, cancelDiscard };
}
