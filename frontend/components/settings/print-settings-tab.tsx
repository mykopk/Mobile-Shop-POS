"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/dropdown";
import { useToast } from "@/components/ui/toast";
import { thermalPrintSupported, printThermalText } from "@/lib/thermal-print";

const DOC_TYPES: { key: string; label: string }[] = [
  { key: "SALE", label: "Sale receipt" },
  { key: "PURCHASE", label: "Purchase" },
  { key: "SALE_RETURN", label: "Sale return" },
  { key: "PURCHASE_RETURN", label: "Purchase return" },
  { key: "VOUCHER", label: "Voucher" },
  { key: "EXPENSE", label: "Expense" },
];

const FORMAT_OPTIONS = [
  { value: "thermal", label: "Thermal (80mm receipt)" },
  { value: "a4", label: "A4 invoice" },
];

export function PrintSettingsTab() {
  const { toast } = useToast();
  const [defaults, setDefaults] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [thermalBusy, setThermalBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await apiRequest<Record<string, string>>("/settings/print-defaults");
        if (!cancelled) setDefaults(d ?? {});
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    setBusy(true);
    try {
      await apiRequest("/settings/print-defaults", { method: "PUT", body: defaults });
      toast("Print defaults saved", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save defaults", "error");
    } finally {
      setBusy(false);
    }
  }

  async function testThermal() {
    setThermalBusy(true);
    try {
      await printThermalText([
        "Fig Mobile",
        "ESC/POS test",
        "This is a test receipt.",
        "Print defaults saved.",
      ]);
      toast("Sent to thermal printer", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Thermal print failed", "error");
    } finally {
      setThermalBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-ink-900">Default print format per document</p>
        <p className="mt-1 text-xs text-ink-500">
          Pick which format opens first in Print Studio for each document type.
        </p>
        <div className="mt-4 space-y-3">
          {DOC_TYPES.map((t) => (
            <div key={t.key} className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-ink-900">{t.label}</span>
              <div className="w-72">
                <Dropdown
                  value={defaults[t.key] ?? "thermal"}
                  options={FORMAT_OPTIONS}
                  onChange={(v) => setDefaults((p) => ({ ...p, [t.key]: v }))}
                />
              </div>
            </div>
          ))}
        </div>
        <Button className="mt-4" onClick={save} disabled={busy || !loaded}>
          {busy ? "Saving…" : "Save defaults"}
        </Button>
      </div>

      <div className="rounded-2xl bg-ink-50 p-4">
        <p className="text-sm font-semibold text-ink-900">Direct thermal printing (ESC/POS)</p>
        <p className="mt-1 text-xs text-ink-500">
          Optional: send a test receipt straight to a USB ESC/POS receipt printer. Requires Chrome/Edge
          and a connected thermal printer. {thermalPrintSupported() ? "" : "WebUSB is not available in this browser."}
        </p>
        <Button variant="secondary" className="mt-3" onClick={testThermal} disabled={thermalBusy || !thermalPrintSupported()}>
          {thermalBusy ? "Printing…" : "Test thermal printer"}
        </Button>
      </div>
    </div>
  );
}
