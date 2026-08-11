"use client";

import { ChevronDownIcon, ChevronUpIcon } from "@/components/icons";

export function SortHeader<K extends string>({
  label,
  k,
  sort,
  onSort,
  right = false,
}: {
  label: string;
  k: K;
  sort: { key: K; dir: "asc" | "desc" };
  onSort: (key: K) => void;
  right?: boolean;
}) {
  const active = sort.key === k;
  return (
    <th className="px-5 py-3">
      <button
        type="button"
        onClick={() => onSort(k)}
        className={`inline-flex items-center gap-1 text-xs uppercase tracking-wide ${
          right ? "w-full justify-end" : ""
        } ${active ? "text-ink-900" : "text-ink-500"}`}
      >
        {label}
        <span className="flex items-center">
          {active ? (
            sort.dir === "asc" ? (
              <ChevronUpIcon className="h-3 w-3" />
            ) : (
              <ChevronDownIcon className="h-3 w-3" />
            )
          ) : (
            <ChevronUpIcon className="h-3 w-3 text-ink-300" />
          )}
        </span>
      </button>
    </th>
  );
}
