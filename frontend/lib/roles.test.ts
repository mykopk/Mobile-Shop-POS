import { describe, expect, it } from "vitest";
import { canViewCosts, hasPermission } from "./roles";
import { PERMISSIONS, ROLE_PERMISSIONS } from "./constants/permissions";
import type { Role } from "./constants/users";

const admin = { role: "ADMIN" as Role };
const manager = { role: "MANAGER" as Role };
const cashier = { role: "CASHIER" as Role };

describe("hasPermission", () => {
  it("grants admins everything", () => {
    expect(hasPermission(admin, PERMISSIONS.moneyWrite)).toBe(true);
    expect(hasPermission(admin, PERMISSIONS.userManage)).toBe(true);
  });

  it("grants managers everything except admin-only", () => {
    expect(hasPermission(manager, PERMISSIONS.moneyWrite)).toBe(true);
    expect(hasPermission(manager, PERMISSIONS.reportProfit)).toBe(true);
    expect(hasPermission(manager, PERMISSIONS.userManage)).toBe(false);
  });

  it("restricts cashiers from money/cost/admin", () => {
    expect(hasPermission(cashier, PERMISSIONS.saleCreate)).toBe(true);
    expect(hasPermission(cashier, PERMISSIONS.moneyView)).toBe(true);
    expect(hasPermission(cashier, PERMISSIONS.moneyWrite)).toBe(false);
    expect(hasPermission(cashier, PERMISSIONS.reportProfit)).toBe(false);
    expect(hasPermission(cashier, PERMISSIONS.userManage)).toBe(false);
  });

  it("respects explicit stored permissions over role defaults", () => {
    const user = { role: "CASHIER" as Role, permissions: [PERMISSIONS.moneyWrite] };
    expect(hasPermission(user, PERMISSIONS.moneyWrite)).toBe(true);
    expect(hasPermission(user, PERMISSIONS.userManage)).toBe(false);
  });

  it("returns false for null/undefined users", () => {
    expect(hasPermission(null, PERMISSIONS.reportView)).toBe(false);
  });
});

describe("canViewCosts", () => {
  it("is true only when the reportProfit permission exists", () => {
    expect(canViewCosts(admin)).toBe(true);
    expect(canViewCosts(manager)).toBe(true);
    expect(canViewCosts(cashier)).toBe(false);
  });
});

describe("ROLE_PERMISSIONS integrity", () => {
  it("every role uses only known permissions", () => {
    const known = new Set(Object.values(PERMISSIONS));
    for (const role of Object.keys(ROLE_PERMISSIONS) as Role[]) {
      for (const p of ROLE_PERMISSIONS[role]) {
        expect(known.has(p)).toBe(true);
      }
    }
  });
});