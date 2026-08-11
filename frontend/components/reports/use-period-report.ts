"use client";

import { useState } from "react";
import { useApi } from "@/lib/use-api";
import { toISODate } from "@/lib/dates";
import type { ReportRange } from "@/lib/api-types";

export function usePeriodReport<T>(base: string) {
  const from = new Date();
  from.setDate(from.getDate() - 29);
  const [range, setRange] = useState<ReportRange>({ from: toISODate(from), to: toISODate(new Date()) });

  const params = new URLSearchParams();
  if (range.from) params.set("from", range.from);
  if (range.to) params.set("to", range.to);
  const qs = params.toString();

  const { data, loading, error, refetch } = useApi<T>(qs ? `${base}?${qs}` : base);

  return { data, loading, error, refetch, range, setRange };
}
