import { prisma } from "./prisma";

export async function writeAudit(input: {
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  details?: string;
}) {
  await prisma.auditLog.create({ data: input });
}
