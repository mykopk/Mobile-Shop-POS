import type { Expense } from "@/lib/api-types";

export const EXPENSE_CATEGORIES = [
  { value: "RENT", label: "Rent" },
  { value: "SALARY", label: "Salary" },
  { value: "ELECTRICITY", label: "Electricity" },
  { value: "INTERNET", label: "Internet" },
  { value: "SUPPLIES", label: "Supplies" },
  { value: "REPAIR", label: "Repair" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "OTHER", label: "Other" },
] as const;

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c) => [c.value, c.label]),
);

export const EXPENSE_FILTERS: { value: "ALL" | Expense["category"]; label: string }[] = [
  { value: "ALL", label: "All" },
  ...EXPENSE_CATEGORIES.map((c) => ({ value: c.value as "ALL" | Expense["category"], label: c.label })),
];

export const EXPENSE_TEXT = {
  subtitle: "Shop operating costs — rent, salary, bills and supplies",
  thisMonth: "This month",
  lastMonth: "Last month",
  thisYear: "This year",
  noData: "No expenses yet — record rent, bills and other running costs here",
  noMatch: "No expenses match these filters",
  category: "Category",
  note: "Note",
  date: "Date",
  addNote: "e.g. Shop rent for August",
};
