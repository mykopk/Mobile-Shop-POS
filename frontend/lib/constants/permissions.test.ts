import { describe, expect, it } from "vitest";
import { PERMISSIONS, PERMISSION_LABELS, ROLE_PERMISSIONS, permissionLabel } from "./permissions";
import type { Role } from "./users";

describe("money permissions", () => {
  it("defines money.view and money.write", () => {
    expect(PERMISSIONS.moneyView).toBe("money.view");
    expect(PERMISSIONS.moneyWrite).toBe("money.write");
  });

  it("labels money permissions", () => {
    expect(PERMISSION_LABELS[PERMISSIONS.moneyView]).toBeTruthy();
    expect(PERMISSION_LABELS[PERMISSIONS.moneyWrite]).toBeTruthy();
    expect(permissionLabel(PERMISSIONS.moneyView)).toMatch(/money/i);
  });

  it("gives admins and managers money.write but not cashiers", () => {
    const perms: Record<Role, readonly string[]> = ROLE_PERMISSIONS;
    expect(perms.ADMIN).toContain(PERMISSIONS.moneyWrite);
    expect(perms.MANAGER).toContain(PERMISSIONS.moneyWrite);
    expect(perms.CASHIER).not.toContain(PERMISSIONS.moneyWrite);
  });

  it("gives cashiers view-only money access", () => {
    expect(ROLE_PERMISSIONS.CASHIER).toContain(PERMISSIONS.moneyView);
  });
});