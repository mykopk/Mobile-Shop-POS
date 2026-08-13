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

export const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  RENT: "bg-brand-600 text-white",
  SALARY: "bg-brand-50 text-brand-700",
  ELECTRICITY: "bg-ink-100 text-ink-600",
  INTERNET: "bg-ink-100 text-ink-600",
  SUPPLIES: "bg-ink-100 text-ink-600",
  REPAIR: "bg-ink-100 text-ink-600",
  TRANSPORT: "bg-ink-100 text-ink-600",
  OTHER: "bg-ink-100 text-ink-600",
};

export const EXPENSE_FILTERS: { value: "ALL" | Expense["category"]; label: string }[] = [
  { value: "ALL", label: "All" },
  ...EXPENSE_CATEGORIES.map((c) => ({ value: c.value as "ALL" | Expense["category"], label: c.label })),
];

export const EXPENSE_DATE_FILTERS = [
  { value: "ALL", label: "All time" },
  { value: "WEEK", label: "This week" },
  { value: "MONTH", label: "This month" },
  { value: "LAST_MONTH", label: "Last month" },
  { value: "YEAR", label: "This year" },
] as const;

export type ExpenseDateFilter = (typeof EXPENSE_DATE_FILTERS)[number]["value"];

export const EXPENSE_SORTS = [
  { value: "date-desc", label: "Newest first" },
  { value: "date-asc", label: "Oldest first" },
  { value: "amount-desc", label: "Amount: high to low" },
  { value: "amount-asc", label: "Amount: low to high" },
  { value: "category-asc", label: "Category A–Z" },
  { value: "category-desc", label: "Category Z–A" },
] as const;

export const EXPENSE_TEXT = {
  subtitle: "Shop operating costs — rent, salary, bills and supplies",
  thisMonth: "This month",
  lastMonth: "Last month",
  thisYear: "This year",
  noData: "No expenses yet — record rent, bills and other running costs here",
  noMatch: "No expenses match these filters",
  clearFilters: "Clear filters",
  searchPlaceholder: "Search notes, amount or category…",
  category: "Category",
  note: "Note",
  date: "Date",
  addNote: "e.g. Shop rent for August",
  sort: "Sort",
  period: "Period",
};
