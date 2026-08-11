import { ReportTable } from "@/components/reports/report-table";
import { Badge } from "@/components/ui/badge";
import type { BalanceRow } from "@/lib/api-types";
import { formatPKR } from "@/lib/money";

export function BalanceList({
  rows,
  kind,
}: {
  rows: BalanceRow[];
  kind: "receivable" | "payable";
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white">
      <ReportTable
        columns={[
          {
            key: "contact",
            label: "Contact",
            render: (r) => (
              <div className="flex items-center gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-ink-900">{r.name}</p>
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
        rows={rows}
        empty={kind === "receivable" ? "No receivables right now." : "No payables right now."}
      />
    </div>
  );
}
