import { prisma } from "../../core/lib/prisma";

export const DEFAULT_BRANDS: {
  id: string;
  name: string;
  sortOrder: number;
}[] = [
  { id: "brand-apple", name: "Apple", sortOrder: 1 },
  { id: "brand-samsung", name: "Samsung", sortOrder: 2 },
  { id: "brand-oneplus", name: "OnePlus", sortOrder: 3 },
  { id: "brand-infinix", name: "Infinix", sortOrder: 4 },
  { id: "brand-xiaomi", name: "Xiaomi", sortOrder: 5 },
  { id: "brand-oppo", name: "Oppo", sortOrder: 6 },
  { id: "brand-vivo", name: "Vivo", sortOrder: 7 },
  { id: "brand-generic", name: "Generic", sortOrder: 8 },
  { id: "brand-other", name: "Other", sortOrder: 9 },
];

export async function seedBrands() {
  const created = [];
  for (const brand of DEFAULT_BRANDS) {
    const existing = await prisma.brand.findUnique({ where: { id: brand.id } });
    if (existing) {
      await prisma.brand.update({
        where: { id: brand.id },
        data: { name: brand.name, sortOrder: brand.sortOrder, active: true },
      });
      continue;
    }
    created.push(
      await prisma.brand.create({
        data: { ...brand, active: true },
      }),
    );
  }
  return created;
}