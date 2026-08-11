export const CARRIER_OPTIONS = ["NON_PTA", "PTA", "SIM_LOCKED"] as const;

export const CARRIER_LABELS: Record<(typeof CARRIER_OPTIONS)[number], string> = {
  NON_PTA: "Non-PTA",
  PTA: "PTA",
  SIM_LOCKED: "Sim Locked (JV)",
};

export const CONDITION_LABELS: Record<"NEW" | "USED", string> = {
  NEW: "New",
  USED: "Used",
};

export const CONDITION_TABS: { value: "" | "NEW" | "USED"; label: string }[] = [
  { value: "", label: "All" },
  { value: "NEW", label: CONDITION_LABELS.NEW },
  { value: "USED", label: CONDITION_LABELS.USED },
];

export type MovementType = "IN" | "OUT" | "ADJUST" | "TRANSFER" | "RESERVED" | "RELEASED";

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  IN: "In",
  OUT: "Out",
  ADJUST: "Adjusted",
  TRANSFER: "Transferred",
  RESERVED: "Reserved",
  RELEASED: "Released",
};

export const MOVEMENT_STYLE: Record<MovementType, string> = {
  IN: "bg-emerald-50 text-emerald-700",
  OUT: "bg-red-50 text-red-700",
  ADJUST: "bg-amber-50 text-amber-700",
  TRANSFER: "bg-blue-50 text-blue-700",
  RESERVED: "bg-amber-50 text-amber-700",
  RELEASED: "bg-emerald-50 text-emerald-700",
};

export type InventoryColumnKey = "imei" | "color" | "category" | "status" | "carrier" | "vendor" | "purchased" | "sell" | "retail" | "cost";

export const INVENTORY_COLUMNS: { key: InventoryColumnKey; label: string }[] = [
  { key: "imei", label: "IMEI" },
  { key: "color", label: "Color" },
  { key: "category", label: "Category" },
  { key: "status", label: "Status" },
  { key: "carrier", label: "Carrier" },
  { key: "vendor", label: "Vendor" },
  { key: "purchased", label: "Purchased" },
  { key: "sell", label: "Sell" },
  { key: "retail", label: "Retail" },
  { key: "cost", label: "Cost" },
];

export type InventoryViewMode = "units" | "quantity";

export type InventoryViewSettings = {
  mode: InventoryViewMode;
  blurCost: boolean;
  columns: Record<InventoryColumnKey, boolean>;
};

export const INVENTORY_VIEW_STORAGE_KEY = "dost.inventory.view";

export const DEFAULT_INVENTORY_VIEW: InventoryViewSettings = {
  mode: "units",
  blurCost: true,
  columns: {
    imei: true,
    color: true,
    category: true,
    status: true,
    carrier: true,
    vendor: true,
    purchased: true,
    sell: true,
    retail: true,
    cost: true,
  },
};
