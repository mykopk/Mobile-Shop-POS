import type { Contact } from "@/lib/api-types";

export function contactInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function creditUsed(contact: Pick<Contact, "receivable" | "payable">): number {
  return (parseFloat(contact.receivable) || 0) + (parseFloat(contact.payable) || 0);
}

export function creditRemaining(contact: Pick<Contact, "creditLimit" | "receivable" | "payable">): number {
  const limit = parseFloat(contact.creditLimit) || 0;
  if (limit <= 0) return 0;
  return Math.max(0, limit - creditUsed(contact));
}
