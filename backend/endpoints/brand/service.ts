import { prisma } from "../../core/lib/prisma";
import { ApiError } from "../../core/middleware/error";
import { writeAudit } from "../../core/lib/audit";
import type { BrandInput, BrandUpdateInput } from "./schemas";

export async function listBrands() {
  return prisma.brand.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
}

export async function createBrand(input: BrandInput, userId: string) {
  const existing = await prisma.brand.findUnique({ where: { name: input.name } });
  if (existing) throw new ApiError(409, "brand.duplicate", "Brand already exists");

  const brand = await prisma.brand.create({
    data: {
      name: input.name,
      sortOrder: input.sortOrder ?? 0,
      active: true,
    },
  });
  await writeAudit({
    userId,
    action: "BRAND.CREATE",
    entity: "Brand",
    entityId: brand.id,
    details: JSON.stringify({ name: brand.name }),
  });
  return brand;
}

export async function updateBrand(id: string, input: BrandUpdateInput, userId: string) {
  const existing = await prisma.brand.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "brand.not_found", "Brand not found");

  if (input.name && input.name !== existing.name) {
    const dup = await prisma.brand.findUnique({ where: { name: input.name } });
    if (dup) throw new ApiError(409, "brand.duplicate", "Brand already exists");
  }

  const brand = await prisma.brand.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    },
  });
  await writeAudit({
    userId,
    action: "BRAND.UPDATE",
    entity: "Brand",
    entityId: brand.id,
    details: JSON.stringify({ name: brand.name, active: brand.active }),
  });
  return brand;
}

export async function deactivateBrand(id: string, userId: string) {
  const existing = await prisma.brand.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!existing) throw new ApiError(404, "brand.not_found", "Brand not found");
  if (existing._count.products > 0) {
    throw new ApiError(409, "brand.in_use", "Cannot deactivate a brand that has products");
  }

  const brand = await prisma.brand.update({
    where: { id },
    data: { active: false },
  });
  await writeAudit({
    userId,
    action: "BRAND.DEACTIVATE",
    entity: "Brand",
    entityId: brand.id,
  });
  return brand;
}

export async function deleteBrand(id: string, userId: string) {
  const existing = await prisma.brand.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!existing) throw new ApiError(404, "brand.not_found", "Brand not found");
  if (existing._count.products > 0) {
    throw new ApiError(409, "brand.in_use", "Cannot delete a brand that has products");
  }

  await prisma.brand.delete({ where: { id } });
  await writeAudit({
    userId,
    action: "BRAND.DELETE",
    entity: "Brand",
    entityId: id,
    details: JSON.stringify({ name: existing.name }),
  });
  return { id, deleted: true };
}
