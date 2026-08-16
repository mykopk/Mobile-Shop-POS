import type { Voucher } from "@/lib/api-types";
import { PAYMENT_METHOD_LABELS } from "./reports";

export const VOUCHER_TYPE_LABELS: Record<Voucher["type"], string> = {
  RECEIVING: "Cash Receiving",
  PAYMENT: "Cash Payment",
};

export const VOUCHER_TYPE_FILTERS: { value: "ALL" | Voucher["type"]; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "RECEIVING", label: "Receiving" },
  { value: "PAYMENT", label: "Payment" },
];

export const VOUCHER_STATUS_FILTERS: { value: "ALL" | Voucher["status"]; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "REVERSED", label: "Reversed" },
];

export const VOUCHER_METHOD_LABELS: Record<Voucher["method"], string> = {
  CASH: PAYMENT_METHOD_LABELS.CASH,
  CARD: PAYMENT_METHOD_LABELS.CARD,
  BANK_TRANSFER: PAYMENT_METHOD_LABELS.BANK_TRANSFER,
};
