"use client";

import Link from "next/link";
import { ReportTable } from "@/components/reports/report-table";
import { Badge } from "@/components/ui/badge";
import { PaginationBar, usePagination } from "@/components/ui/pagination";
import type { BalanceRow } from "@/lib/api-types";
import { formatPKR } from "@/lib/money";
import { ledgerHref } from "@/lib/ledger";

export function BalanceList({
  rows,
  kind,
}: {
  rows: BalanceRow[];
  kind: "receivable" | "payable";
}) {
  const { page, pageSize, setPage, setPageSize, pageCount, from, to, slice } = usePagination(rows.length);
  const pageItems = slice(rows);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl bg-white">
        <ReportTable
          columns={[
            {
              key: "contact",
              label: "Contact",
              render: (r) => (
                <div className="flex items-center gap-2">
                  <div className="min-w-0">
                    <Link
                      href={ledgerHref(r.contactId)}
                      title="Open last 1 month ledger"
                      className="font-medium text-ink-900 transition hover:text-brand-600"
                    >
                      {r.name}
                    </Link>
                    {r.phone && <p className="text-xs text-ink-400">{r.phone}</p>}
                  </div>
                  {r.source === "REFUND" && <Badge variant="warning">Refund due</Badge>}
                </div>
              ),
            },
            { key: "count", label: "Open", align: "right", render: (r) => r.count },
            { key: "total", label: "Total", align: "right", render: (r) => formatPKR(r.total) },
            { key: "paid", label: "Paid", align: "right", render: (r) => formatPKR(r.paid) },
            {
              key: "outstanding",
              label: kind === "receivable" ? "Owed to you" : "You owe",
              align: "right",
              render: (r) => <span className="font-semibold text-ink-900">{formatPKR(r.outstanding)}</span>,
            },
          ]}
          rows={pageItems}
          rowKey={(r) => r.contactId}
          empty={kind === "receivable" ? "No receivables right now." : "No payables right now."}
        />
      </div>

      <PaginationBar
        from={from}
        to={to}
        total={rows.length}
        page={page}
        pageCount={pageCount}
        pageSize={pageSize}
        onPrev={() => setPage(page - 1)}
        onNext={() => setPage(page + 1)}
        onPageSize={setPageSize}
      />
    </div>
  );
}
