import { prisma } from "../../core/lib/prisma";
import { ApiError } from "../../core/middleware/error";
import { writeAudit } from "../../core/lib/audit";
import type { CategoryInput, CategoryUpdateInput } from "./schemas";

export async function listCategories() {
  return prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
}

export async function createCategory(input: CategoryInput, userId: string) {
  const existing = await prisma.category.findUnique({ where: { name: input.name } });
  if (existing) throw new ApiError(409, "category.duplicate", "Category already exists");

  const category = await prisma.category.create({
    data: {
      name: input.name,
      type: input.type,
      sortOrder: input.sortOrder ?? 0,
      active: true,
    },
  });
  await writeAudit({
    userId,
    action: "CATEGORY.CREATE",
    entity: "Category",
    entityId: category.id,
    details: JSON.stringify({ name: category.name, type: category.type }),
  });
  return category;
}

export async function updateCategory(id: string, input: CategoryUpdateInput, userId: string) {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "category.not_found", "Category not found");

  if (input.name && input.name !== existing.name) {
    const dup = await prisma.category.findUnique({ where: { name: input.name } });
    if (dup) throw new ApiError(409, "category.duplicate", "Category already exists");
  }

  const category = await prisma.category.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    },
  });
  await writeAudit({
    userId,
    action: "CATEGORY.UPDATE",
    entity: "Category",
    entityId: category.id,
    details: JSON.stringify({ name: category.name, active: category.active }),
  });
  return category;
}

export async function deactivateCategory(id: string, userId: string) {
  const existing = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!existing) throw new ApiError(404, "category.not_found", "Category not found");
  if (existing._count.products > 0) {
    throw new ApiError(409, "category.in_use", "Cannot deactivate a category that has products");
  }

  const category = await prisma.category.update({
    where: { id },
    data: { active: false },
  });
  await writeAudit({
    userId,
    action: "CATEGORY.DEACTIVATE",
    entity: "Category",
    entityId: category.id,
  });
  return category;
}

export async function deleteCategory(id: string, userId: string) {
  const existing = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!existing) throw new ApiError(404, "category.not_found", "Category not found");
  if (existing._count.products > 0) {
    throw new ApiError(409, "category.in_use", "Cannot delete a category that has products");
  }

  await prisma.category.delete({ where: { id } });
  await writeAudit({
    userId,
    action: "CATEGORY.DELETE",
    entity: "Category",
    entityId: id,
    details: JSON.stringify({ name: existing.name }),
  });
  return { id, deleted: true };
}
