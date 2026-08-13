import { prisma } from "../../core/lib/prisma";

export type AuditFilters = {
  action?: string;
  entity?: string;
  userId?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

const PAGE_SIZE_DEFAULT = 25;
const PAGE_SIZE_MAX = 100;

export async function listAuditLogs(filters: AuditFilters) {
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, Math.floor(filters.pageSize ?? PAGE_SIZE_DEFAULT)));

  const where: Record<string, unknown> = {};
  if (filters.action) where.action = filters.action;
  if (filters.entity) where.entity = filters.entity;
  if (filters.userId) where.userId = filters.userId;
  if (filters.search) {
    where.OR = [
      { entityId: { contains: filters.search } },
      { details: { contains: filters.search } },
    ];
  }
  if (filters.from || filters.to) {
    where.createdAt = {
      ...(filters.from ? { gte: new Date(`${filters.from}T00:00:00`) } : {}),
      ...(filters.to ? { lte: new Date(`${filters.to}T23:59:59.999`) } : {}),
    };
  }

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function getAuditMeta() {
  const logs = await prisma.auditLog.findMany({
    select: { action: true, entity: true },
    distinct: ["action", "entity"],
  });
  const actions = [...new Set(logs.map((l) => l.action))].sort();
  const entities = [...new Set(logs.map((l) => l.entity))].sort();
  return { actions, entities };
}
