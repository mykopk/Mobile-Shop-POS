export type PrintFormatId = "58" | "80" | "a4";

export type QrTarget = "none" | "whatsapp";

export type PrintLayoutType = "document" | "inventory";

export const PRINT_LAYOUT_TYPES: { value: PrintLayoutType; label: string }[] = [
  { value: "document", label: "Documents" },
  { value: "inventory", label: "Inventory" },
];

export const INVENTORY_FORMAT_IDS: PrintFormatId[] = ["80", "a4"];

export const QR_TARGETS: { id: QrTarget; label: string; hint: string }[] = [
  { id: "none", label: "None", hint: "No QR code on the receipt" },
  { id: "whatsapp", label: "WhatsApp", hint: "Customer scans to contact the shop via WhatsApp" },
];

export const PRINT_FORMATS: {
  id: PrintFormatId;
  label: string;
  hint: string;
  previewWidth: number;
  printWidthMm: number;
  pageSize: string;
  pageMargin: string;
}[] = [
  {
    id: "58",
    label: "58mm thermal",
    hint: "Thermal roll printer, 58mm paper width",
    previewWidth: 280,
    printWidthMm: 58,
    pageSize: "58mm auto",
    pageMargin: "0",
  },
  {
    id: "80",
    label: "80mm thermal",
    hint: "Thermal roll printer, 80mm paper width",
    previewWidth: 384,
    printWidthMm: 80,
    pageSize: "80mm auto",
    pageMargin: "0",
  },
  {
    id: "a4",
    label: "A4 invoice",
    hint: "Standard A4 sheet, full page",
    previewWidth: 720,
    printWidthMm: 198,
    pageSize: "A4",
    pageMargin: "6mm",
  },
];

export const PRINT = {
  storageKey: "dost.print.options",
  invOptionsKey: "dost.print.invOptions",
  formatKey: "dost.print.format",
  qrTypeKey: "dost.print.qrType",
  bankAccountsTitle: "Bank Payment Details",
} as const;

export const RECEIPT_TEXT = {
  document: {
    SALE: "Sales Receipt",
    PURCHASE: "Purchase Invoice",
    SALE_RETURN: "Sales Return Receipt",
    PURCHASE_RETURN: "Purchase Return Invoice",
    fallback: "Transaction Document",
  },
  receiptNo: "Receipt No.",
  date: "Transaction Date",
  contact: "Customer",
  phone: "Contact Number",
  processedBy: "Processed By",
  item: "Description",
  items: "Items",
  productDescription: "Product Description",
  no: "No.",
  quantity: "Quantity",
  unitPrice: "Unit Price",
  amount: "Total",
  imei: "Serial / IMEI",
  subtotal: "Subtotal",
  discount: "Discount Applied",
  grandTotal: "Amount Payable",
  total: "Total Amount",
  payments: "Payment Details",
  note: "Transaction Notes",
  terms: "Terms",
  refundCash: "Refunded in cash",
  refundCredit: "Refund pending — returned but not paid yet",
  refundPartial: "Partially refunded — rest on credit account",
  bankAccounts: "Bank Payment Details",
  signature: "Authorized Signature",
  receivedBy: "Customer Signature",
  footerFallback: "Thank you for choosing us. We appreciate your business.",
  quantityUnits: "Unit(s)",
  paid: "Paid",
  noNotes: "No additional notes",
} as const;

export const PRINT_DEFAULT_OPTIONS = {
  header: true,
  shopInfo: true,
  barcode: true,
  number: true,
  date: true,
  contact: true,
  phone: true,
  cashier: true,
  imeis: true,
  payments: true,
  bankAccounts: false,
  note: true,
  signature: false,
  thanks: true,
} as const;

export type PrintOptions = Record<keyof typeof PRINT_DEFAULT_OPTIONS, boolean> & {
  qrType: QrTarget;
};

export type PrintBooleanOptions = Omit<PrintOptions, "qrType">;

export const PRINT_OPTION_LABELS: { key: keyof PrintBooleanOptions; label: string; hint: string }[] = [
  { key: "header", label: "Shop name & title", hint: "Store name and document title" },
  { key: "shopInfo", label: "Shop tagline", hint: "One-line description below the shop name" },
  { key: "barcode", label: "Barcode", hint: "Scannable code for the document number" },
  { key: "number", label: "Document number", hint: "Reference number of the transaction" },
  { key: "date", label: "Date & time", hint: "Date and time of the transaction" },
  { key: "contact", label: "Contact name", hint: "Name of the customer or supplier" },
  { key: "phone", label: "Contact phone", hint: "Phone number of the contact" },
  { key: "cashier", label: "Handled by", hint: "Staff member who processed the transaction" },
  { key: "imeis", label: "IMEIs", hint: "IMEI of each device sold" },
  { key: "payments", label: "Payments", hint: "Payment methods and amounts" },
  { key: "bankAccounts", label: "Bank accounts", hint: "Company bank details for bank transfers" },
  { key: "note", label: "Note", hint: "Additional notes on the transaction" },
  { key: "signature", label: "Signature line", hint: "Space for a signature" },
  { key: "thanks", label: "Thank-you footer", hint: "Closing message at the bottom" },
];

export type InventoryPrintOptionKey =
  | "header"
  | "shopInfo"
  | "product"
  | "imeis"
  | "color"
  | "condition"
  | "status"
  | "carrier"
  | "grade"
  | "battery"
  | "vendor"
  | "purchased"
  | "sell"
  | "retail"
  | "cost"
  | "signature"
  | "footer";

export const INVENTORY_DEFAULT_OPTIONS: Record<InventoryPrintOptionKey, boolean> = {
  header: true,
  shopInfo: true,
  product: true,
  imeis: true,
  color: true,
  condition: true,
  status: true,
  carrier: true,
  grade: true,
  battery: true,
  vendor: true,
  purchased: true,
  sell: true,
  retail: true,
  cost: true,
  signature: false,
  footer: true,
};

export type InventoryPrintOptions = Record<InventoryPrintOptionKey, boolean>;

export const INVENTORY_OPTION_LABELS: { key: InventoryPrintOptionKey; label: string; hint: string }[] = [
  { key: "header", label: "Shop name & title", hint: "Store name and “Inventory List” title" },
  { key: "shopInfo", label: "Shop tagline", hint: "One-line description below the shop name" },
  { key: "product", label: "Product", hint: "Brand, model and storage of each unit" },
  { key: "imeis", label: "IMEI", hint: "Serial / IMEI of each unit" },
  { key: "color", label: "Color", hint: "Color of the device" },
  { key: "condition", label: "Condition", hint: "New or used" },
  { key: "status", label: "Status", hint: "In stock, sold, reserved, returned…" },
  { key: "carrier", label: "Carrier", hint: "PTA / non-PTA / sim-locked" },
  { key: "grade", label: "Grade", hint: "A / B / C used-phone grade" },
  { key: "battery", label: "Battery health", hint: "Battery health percentage" },
  { key: "vendor", label: "Vendor", hint: "Supplier the unit was bought from" },
  { key: "purchased", label: "Purchased date", hint: "Date the unit was bought in" },
  { key: "sell", label: "Sell price", hint: "Current selling price" },
  { key: "retail", label: "Retail price", hint: "Recommended retail price" },
  { key: "cost", label: "Cost price", hint: "Cost paid for the unit (hidden for cashiers)" },
  { key: "signature", label: "Signature line", hint: "Space for a signature" },
  { key: "footer", label: "Footer & summary", hint: "Closing message and stock summary" },
];

export const INVENTORY_TEXT = {
  title: "Inventory List",
  generated: "Generated",
  printedBy: "Printed by",
  totalUnits: "Total units",
  inStock: "In stock",
  notInStock: "Not in stock",
  stockValue: "Stock value (cost)",
  salesValue: "Stock value (sell)",
  no: "No.",
  unit: "unit",
  units: "units",
  signature: "Authorized Signature",
  noData: "No units found.",
} as const;
