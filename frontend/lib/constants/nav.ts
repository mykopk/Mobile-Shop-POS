import type { NavIconKey } from "@/components/icons";

export const NAV_ITEMS: { href: string; label: string; icon: NavIconKey }[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/pos", label: "POS", icon: "pos" },
  { href: "/reservations", label: "Reservations", icon: "reservation" },
  { href: "/vouchers", label: "Vouchers", icon: "voucher" },
  { href: "/expenses", label: "Expenses", icon: "expenses" },
  { href: "/purchases", label: "Purchases", icon: "purchases" },
  { href: "/purchase-returns", label: "Purchase Returns", icon: "returns" },
  { href: "/sale-returns", label: "Sale Returns", icon: "refund" },
  { href: "/inventory", label: "Inventory", icon: "inventory" },
  { href: "/products", label: "Products", icon: "products" },
  { href: "/contacts", label: "Contacts", icon: "contacts" },
  { href: "/reports", label: "Reports", icon: "reports" },
  { href: "/analytics", label: "Analytics", icon: "analytics" },
  { href: "/print", label: "Print Studio", icon: "print" },
  { href: "/settings", label: "Settings", icon: "settings" },
] as const;
