"use client";

import { useState } from "react";
import { HELP_SECTIONS, type HelpSectionId } from "@/lib/constants";
import { SearchInput } from "@/components/ui/search-input";
import { HelpIcon } from "@/components/icons";

export function HelpSidebar({
  activeSection,
  onSectionClick,
}: {
  activeSection: HelpSectionId;
  onSectionClick: (section: HelpSectionId) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const sections = HELP_SECTIONS.filter((s) => !q || s.label.toLowerCase().includes(q));

  return (
    <aside className="w-56 shrink-0 overflow-y-auto overscroll-none pb-4 print:hidden">
      <div className="mb-4 flex items-center gap-2 px-1">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white">
          <HelpIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-900">Help & support</p>
          <p className="truncate text-xs text-ink-500">Documentation and contact</p>
        </div>
      </div>

      <SearchInput value={query} onChange={setQuery} placeholder="Search help…" wrapperClassName="px-1" />

      <p className="mb-1 mt-3 px-1 text-xs font-medium uppercase tracking-wide text-ink-400">Sections</p>
      <div className="space-y-0.5">
        {sections.map((s) => {
          const active = s.id === activeSection;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSectionClick(s.id)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm font-medium transition ${
                active ? "bg-brand-500 text-white" : "text-ink-700 hover:bg-ink-100"
              }`}
            >
              <span className="flex-1 text-left">{s.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
