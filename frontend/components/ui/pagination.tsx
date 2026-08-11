"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/dropdown";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

const PAGE_SIZE_OPTIONS = ["10", "25", "50", "100"];

export function usePagination(itemCount: number, defaultPageSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const pageCount = Math.max(1, Math.ceil(itemCount / pageSize));
  const safePage = Math.min(page, pageCount);
  const from = itemCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, itemCount);

  useEffect(() => {
    setPage(1);
  }, [itemCount, pageSize]);

  return {
    page: safePage,
    pageSize,
    setPage,
    setPageSize,
    pageCount,
    from,
    to,
    slice: <T,>(items: T[]) => items.slice((safePage - 1) * pageSize, safePage * pageSize),
  };
}

export function PaginationBar({
  from,
  to,
  total,
  page,
  pageCount,
  pageSize,
  onPrev,
  onNext,
  onPageSize,
}: {
  from: number;
  to: number;
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  onPrev: () => void;
  onNext: () => void;
  onPageSize: (size: number) => void;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3">
      <p className="text-sm text-ink-500">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Dropdown
          value={String(pageSize)}
          onChange={(v) => onPageSize(Number(v))}
          className="w-24"
          trigger={
            <div className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 text-sm">
              <span className="text-ink-900">{pageSize} / pg</span>
            </div>
          }
          options={PAGE_SIZE_OPTIONS.map((v) => ({ value: v, label: v }))}
        />
        <Button variant="grey" disabled={page <= 1} onClick={onPrev}>
          <ChevronLeftIcon className="h-4 w-4" />
          Prev
        </Button>
        <span className="text-sm text-ink-500">
          Page {page} of {pageCount}
        </span>
        <Button variant="grey" disabled={page >= pageCount} onClick={onNext}>
          Next
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
