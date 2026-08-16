"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/apiClient";

export function useSetupStatus() {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiRequest<{ needsSetup: boolean }>("/setup/status")
      .then((d) => {
        if (!cancelled) setNeedsSetup(Boolean(d.needsSetup));
      })
      .catch(() => {
        if (!cancelled) setNeedsSetup(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { needsSetup, loading: needsSetup === null };
}