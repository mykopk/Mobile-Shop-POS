import type { Role } from "../../generated/prisma/enums";
import { prisma } from "./prisma";

export const CAN_VIEW_COSTS: Role[] = ["ADMIN", "MANAGER"];

export function canViewCosts(role: Role | undefined): boolean {
  return !!role && CAN_VIEW_COSTS.includes(role);
}

export async function writeAudit(input: {
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  details?: string;
}) {
  await prisma.auditLog.create({ data: input });
}
