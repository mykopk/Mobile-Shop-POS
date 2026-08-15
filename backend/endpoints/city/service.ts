import { prisma } from "../../core/lib/prisma";
import { ApiError } from "../../core/middleware/error";
import { writeAudit } from "../../core/lib/audit";
import type { CityInput } from "./schemas";

export async function listCities() {
  return prisma.city.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function createCity(input: CityInput, userId: string) {
  const existing = await prisma.city.findFirst({
    where: { name: { equals: input.name, mode: "insensitive" } },
  });
  if (existing) throw new ApiError(409, "city.duplicate", "City already exists");

  const city = await prisma.city.create({ data: { name: input.name } });
  await writeAudit({
    userId,
    action: "CITY.CREATE",
    entity: "City",
    entityId: city.id,
    details: JSON.stringify({ name: city.name }),
  });
  return city;
}

export async function updateCity(id: string, input: CityInput, userId: string) {
  const existing = await prisma.city.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "city.not_found", "City not found");

  const dup = await prisma.city.findFirst({
    where: { name: { equals: input.name, mode: "insensitive" }, id: { not: id } },
  });
  if (dup) throw new ApiError(409, "city.duplicate", "City already exists");

  const city = await prisma.city.update({ where: { id }, data: { name: input.name } });
  await writeAudit({
    userId,
    action: "CITY.UPDATE",
    entity: "City",
    entityId: city.id,
    details: JSON.stringify({ name: city.name }),
  });
  return city;
}

export async function deleteCity(id: string, userId: string) {
  const existing = await prisma.city.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "city.not_found", "City not found");

  await prisma.city.delete({ where: { id } });
  await writeAudit({
    userId,
    action: "CITY.DELETE",
    entity: "City",
    entityId: id,
    details: JSON.stringify({ name: existing.name }),
  });
  return { id, deleted: true };
}
