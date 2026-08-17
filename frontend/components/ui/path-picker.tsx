"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FolderIcon } from "@/components/icons";

function truncatePath(p: string, max = 48) {
  if (p.length <= max) return p;
  const head = Math.ceil(max * 0.6);
  const tail = max - head - 1;
  return `${p.slice(0, head)}…${p.slice(-tail)}`;
}

export function PathPicker({
  value,
  onChange,
  placeholder,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [picking, setPicking] = useState(false);

  async function pick() {
    if (!window.fig?.dialog) return;
    setPicking(true);
    try {
      const dir = await window.fig.dialog.pickDirectory();
      if (dir) onChange(dir);
    } finally {
      setPicking(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <Input
          variant="white"
          value={value ? truncatePath(value) : value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          title={value}
        />
      </div>
      <Button
        variant="grey"
        type="button"
        onClick={() => void pick()}
        disabled={disabled || picking || !window.fig?.dialog}
        className="shrink-0"
      >
        <FolderIcon className="h-4 w-4" />
        {picking ? "Choosing…" : "Choose"}
      </Button>
    </div>
  );
}