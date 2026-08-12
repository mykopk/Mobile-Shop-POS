"use client";

import { useRef } from "react";
import type { ReactNode } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { UploadIcon } from "@/components/icons";

export function CsvImportSheet({
  open,
  title,
  description,
  importing,
  onFile,
  onClose,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  importing: boolean;
  onFile: (file: File) => void;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <Sheet open={open} title={title} onClose={onClose} width="max-w-lg">
      <div className="space-y-4">
        <p className="text-sm text-ink-500">{description}</p>
        <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50 p-6 text-center">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFile(file);
              e.target.value = "";
            }}
          />
          <Button variant="grey" onClick={() => fileRef.current?.click()} disabled={importing}>
            <UploadIcon className="h-4 w-4" />
            {importing ? "Importing…" : "Choose CSV file"}
          </Button>
          <p className="mt-2 text-xs text-ink-400">Tip: use Export CSV to get the exact format.</p>
        </div>
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose} disabled={importing}>
            Close
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
