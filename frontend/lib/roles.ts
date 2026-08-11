import type { Role } from "@/lib/constants/users";

export function canViewCosts(role: Role | undefined) {
  return role === "ADMIN" || role === "MANAGER";
}
