"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dropdown } from "@/components/ui/dropdown";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

type RuntimeConfig = { mode: "local" | "hosted"; hostedUrl: string };
type ReportConfig = { enabled: boolean; repo: string; hasToken: boolean };

export function DesktopAppTab() {
  const { toast } = useToast();
  const isElectron = typeof window !== "undefined" && Boolean(window.fig?.isElectron);
  const [config, setConfig] = useState<RuntimeConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState<string[] | null>(null);
  const [report, setReport] = useState<ReportConfig | null>(null);
  const [reportToken, setReportToken] = useState("");
  const [savingReport, setSavingReport] = useState(false);

  useEffect(() => {
    if (!isElectron) return;
    void window.fig?.runtime
      ?.get()
      .then(setConfig)
      .catch(() => setConfig(null));
    void window.fig?.report
      ?.get()
      .then(setReport)
      .catch(() => setReport(null));
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

      <div className="rounded-3xl bg-white p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-500">Crash reporting</p>
        {report ? (
          <div className="space-y-3">
            <Checkbox
              checked={report.enabled}
              onChange={(v) => setReport((r) => (r ? { ...r, enabled: v } : r))}
              label="Send crash reports to GitHub Issues"
              description="When the app fails to start or crashes, it opens a GitHub Issue with the error, system info and the last log lines."
            />
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">Repository</p>
              <Input
                value={report.repo}
                onChange={(e) => setReport((r) => (r ? { ...r, repo: e.target.value } : r))}
                placeholder="owner/repo"
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
                GitHub token {report.hasToken && <span className="text-ink-400">(saved)</span>}
              </p>
              <Input
                type="password"
                value={reportToken}
                onChange={(e) => setReportToken(e.target.value)}
                placeholder={report.hasToken ? "•••••••• (leave blank to keep current)" : "paste a token with issues:write"}
              />
            </div>
            <Button
              variant="grey"
              size="sm"
              loading={savingReport}
              onClick={async () => {
                setSavingReport(true);
                try {
                  await window.fig?.report?.set({
                    enabled: report.enabled,
                    repo: report.repo,
                    token: reportToken,
                  });
                  setReportToken("");
                  const updated = await window.fig?.report?.get();
                  if (updated) setReport(updated);
                  toast("Crash reporting updated", "success");
                } catch {
                  toast("Could not save crash reporting settings", "error");
                } finally {
                  setSavingReport(false);
                }
              }}
            >
              Save crash reporting
            </Button>
            <p className="rounded-2xl bg-ink-50 px-3.5 py-2.5 text-xs text-ink-500">
              Use a low-privilege token limited to this repo. Reports appear as Issues on GitHub.
            </p>
          </div>
        ) : (
          <p className="rounded-2xl bg-ink-50 px-4 py-3 text-sm text-ink-500">
            Crash reporting is only available in the desktop app.
          </p>
        )}
      </div>

      <div className="rounded-3xl bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Diagnostics / logs</p>
          <div className="flex gap-2">
            <Button variant="grey" size="sm" onClick={() => void window.fig?.logs?.open()}>
              Open logs folder
            </Button>
            <Button variant="grey" size="sm" onClick={() => void window.fig?.logs?.get().then(setLogs)}>
              {logs ? "Refresh logs" : "View logs"}
            </Button>
          </div>
        </div>
        {logs && (
          <pre className="max-h-64 overflow-auto rounded-2xl bg-ink-50 p-3 text-xs leading-relaxed text-ink-700">
            {logs.join("\n")}
          </pre>
        )}
        <p className="mt-2 rounded-2xl bg-ink-50 px-3.5 py-2.5 text-xs text-ink-500">
          If the app fails to start or closes, the log file explains why. Share its last lines when
          reporting a problem.
        </p>
      </div>
    </div>
  );
}