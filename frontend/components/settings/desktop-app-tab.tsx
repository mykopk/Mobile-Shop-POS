"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/dropdown";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

type RuntimeConfig = { mode: "local" | "hosted"; hostedUrl: string };

export function DesktopAppTab() {
  const { toast } = useToast();
  const isElectron = typeof window !== "undefined" && Boolean(window.fig?.isElectron);
  const [config, setConfig] = useState<RuntimeConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isElectron) return;
    void window.fig?.runtime
      ?.get()
      .then(setConfig)
      .catch(() => setConfig(null));
  }, [isElectron]);

  if (!isElectron) {
    return (
      <p className="rounded-2xl bg-ink-50 px-4 py-3 text-sm text-ink-500">
        This only applies to the desktop app. When running in a browser the app connects to the API
        configured for the website.
      </p>
    );
  }

  async function save() {
    if (!config) return;
    if (config.mode === "hosted" && !/^https?:\/\//.test(config.hostedUrl.trim())) {
      toast("Enter a valid URL starting with http(s)", "error");
      return;
    }
    setSaving(true);
    try {
      await window.fig?.runtime?.set({
        mode: config.mode,
        hostedUrl: config.mode === "hosted" ? config.hostedUrl.trim() : "",
      });
      toast("Saved — restarting the app…", "success");
    } catch {
      toast("Could not save the mode", "error");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-white p-4">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">Where the app runs from</p>
        <Dropdown
          value={config?.mode ?? "local"}
          options={[
            { value: "local", label: "Local server on this computer" },
            { value: "hosted", label: "Hosted website (URL)" },
          ]}
          onChange={(v) => setConfig((c) => ({ ...(c ?? { mode: "local", hostedUrl: "" }), mode: v as "local" | "hosted" }))}
        />
        {config?.mode === "hosted" && (
          <div className="mt-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">Website URL</p>
            <Input
              value={config.hostedUrl}
              onChange={(e) => setConfig((c) => ({ ...(c ?? { mode: "hosted", hostedUrl: "" }), hostedUrl: e.target.value }))}
              placeholder="https://pos.example.com"
            />
          </div>
        )}
        <div className="mt-3 rounded-2xl bg-ink-50 px-3.5 py-2.5 text-xs text-ink-500">
          {config?.mode === "hosted"
            ? "The desktop app will open the hosted website and use its backend. Your local data stays on this computer."
            : "The desktop app starts its own backend + frontend on this computer and keeps data in a local file."}
        </div>
      </div>

      <Button onClick={() => void save()} loading={saving} disabled={!config}>
        Save &amp; restart app
      </Button>
    </div>
  );
}