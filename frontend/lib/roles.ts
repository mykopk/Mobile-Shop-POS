import type { Role } from "@/lib/constants/users";
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  type Permission,
} from "@/lib/constants/permissions";

export function hasPermission(
  user: { role?: Role; permissions?: readonly string[] } | null | undefined,
  permission: Permission,
) {
  const perms = user?.permissions ?? (user ? ROLE_PERMISSIONS[user.role ?? "CASHIER"] : undefined);
  return perms ? perms.includes(permission) : false;
}

export function canViewCosts(user: { role?: Role; permissions?: readonly string[] } | null | undefined) {
  return hasPermission(user, PERMISSIONS.reportProfit);
}
