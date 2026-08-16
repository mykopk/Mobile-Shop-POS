"use client";

import { useRef, useState } from "react";
import { apiRequest } from "@/lib/apiClient";
import { API_BASE } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

function downloadBlob(url: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function BackupTab() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"export" | "restore" | null>(null);

  async function doExport() {
    setBusy("export");
    try {
      const url = `${API_BASE}/backup`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        toast(`Backup failed (${res.status})`, "error");
        return;
      }
      const blob = await res.blob();
      const stamp = new Date().toISOString().slice(0, 10);
      downloadBlob(URL.createObjectURL(blob), `fig-backup-${stamp}.db`);
      toast("Backup downloaded", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Backup failed", "error");
    } finally {
      setBusy(null);
    }
  }

  async function doRestore(file: File) {
    setBusy("restore");
    try {
      const res = await fetch(`${API_BASE}/backup/restore`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/octet-stream" },
        body: file,
      });
      if (!res.ok) {
        let message = `Restore failed (${res.status})`;
        try {
          const body = await res.json();
          message = body.error?.message ?? message;
        } catch {
          /* keep default */
        }
        toast(message, "error");
        return;
      }
      toast("Database restored. Refresh the app.", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Restore failed", "error");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function onPick(file: File | null) {
    if (!file) return;
    if (file.size === 0) {
      toast("File is empty", "error");
      return;
    }
    const confirmed = window.confirm(
      "This replaces your entire database with the uploaded file. This cannot be undone. Continue?",
    );
    if (confirmed) void doRestore(file);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-ink-900">Backup</p>
        <p className="mt-1 text-xs text-ink-500">
          Download a copy of your entire database (customers, stock, sales, settings) as a single file.
          Do this regularly.
        </p>
        <Button onClick={doExport} disabled={busy !== null} className="mt-3">
          {busy === "export" ? "Exporting…" : "Download backup"}
        </Button>
      </div>

      <div className="rounded-2xl bg-warning/5 p-4 ring-1 ring-warning/20">
        <p className="text-sm font-semibold text-ink-900">Restore</p>
        <p className="mt-1 text-xs text-ink-500">
          Upload a backup file to replace the current database. This overwrites everything, so the
          app will reload after restoring.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".db,application/octet-stream"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
        <Button variant="destructive" onClick={() => fileRef.current?.click()} disabled={busy !== null} className="mt-3">
          {busy === "restore" ? "Restoring…" : "Restore from file"}
        </Button>
      </div>
    </div>
  );
}
