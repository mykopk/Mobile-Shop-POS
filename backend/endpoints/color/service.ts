import { prisma } from "../../core/lib/prisma";
import { ApiError } from "../../core/middleware/error";
import { writeAudit } from "../../core/lib/audit";
import type { ColorInput, ColorUpdateInput } from "./schemas";

export async function listColors() {
  return prisma.color.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
}

export async function createColor(input: ColorInput, userId: string) {
  const existing = await prisma.color.findUnique({ where: { name: input.name } });
  if (existing) throw new ApiError(409, "color.duplicate", "Color already exists");

  const color = await prisma.color.create({
    data: {
      name: input.name,
      sortOrder: input.sortOrder ?? 0,
      active: true,
    },
  });
  await writeAudit({
    userId,
    action: "COLOR.CREATE",
    entity: "Color",
    entityId: color.id,
    details: JSON.stringify({ name: color.name }),
  });
  return color;
}

export async function updateColor(id: string, input: ColorUpdateInput, userId: string) {
  const existing = await prisma.color.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "color.not_found", "Color not found");

  if (input.name && input.name !== existing.name) {
    const dup = await prisma.color.findUnique({ where: { name: input.name } });
    if (dup) throw new ApiError(409, "color.duplicate", "Color already exists");
  }

  const color = await prisma.color.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    },
  });
  await writeAudit({
    userId,
    action: "COLOR.UPDATE",
    entity: "Color",
    entityId: color.id,
    details: JSON.stringify({ name: color.name, active: color.active }),
  });
  return color;
}

export async function deactivateColor(id: string, userId: string) {
  const existing = await prisma.color.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!existing) throw new ApiError(404, "color.not_found", "Color not found");
  if (existing._count.products > 0) {
    throw new ApiError(409, "color.in_use", "Cannot deactivate a color that has products");
  }

  const color = await prisma.color.update({
    where: { id },
    data: { active: false },
  });
  await writeAudit({
    userId,
    action: "COLOR.DEACTIVATE",
    entity: "Color",
    entityId: color.id,
  });
  return color;
}

export async function deleteColor(id: string, userId: string) {
  const existing = await prisma.color.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!existing) throw new ApiError(404, "color.not_found", "Color not found");
  if (existing._count.products > 0) {
    throw new ApiError(409, "color.in_use", "Cannot delete a color that has products");
  }

  await prisma.color.delete({ where: { id } });
  await writeAudit({
    userId,
    action: "COLOR.DELETE",
    entity: "Color",
    entityId: id,
    details: JSON.stringify({ name: existing.name }),
  });
  return { id, deleted: true };
}
