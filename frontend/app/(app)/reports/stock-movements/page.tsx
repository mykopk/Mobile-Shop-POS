"use client";

import { StockMovementsList } from "@/components/reports/stock-movements-list";

export default function StockMovementsReportPage() {
  return (
    <StockMovementsList
      title="Stock movements"
      subtitle="Units entering and leaving your inventory in the selected period."
    />
  );
}
