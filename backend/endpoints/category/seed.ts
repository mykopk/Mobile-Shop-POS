import { prisma } from "../../core/lib/prisma";
import type { CategoryType } from "../../generated/prisma/enums";

export const DEFAULT_CATEGORIES: {
  id: string;
  name: string;
  type: CategoryType;
  sortOrder: number;
}[] = [
  { id: "cat-phone-new", name: "New Phone", type: "PHONE", sortOrder: 1 },
  { id: "cat-phone-used", name: "Used Phone", type: "PHONE", sortOrder: 2 },
  { id: "cat-accessory", name: "Accessory", type: "ACCESSORY", sortOrder: 3 },
];

export async function seedCategories() {
  const created = [];
  for (const cat of DEFAULT_CATEGORIES) {
    const existing = await prisma.category.findUnique({ where: { id: cat.id } });
    if (existing) {
      await prisma.category.update({
        where: { id: cat.id },
        data: { name: cat.name, type: cat.type, sortOrder: cat.sortOrder, active: true },
      });
      continue;
    }
    created.push(
      await prisma.category.create({
        data: { ...cat, active: true },
      }),
    );
  }
  return created;
}