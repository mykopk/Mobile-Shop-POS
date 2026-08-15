import { prisma } from "../core/lib/prisma";
import { seedUser, resetDb } from "./helpers";

export async function seedScenario() {
  await resetDb();
  await seedUser("FLOWS_ADMIN", "ADMIN");

  await prisma.companyProfile.upsert({
    where: { id: "store" },
    create: { id: "store", name: "Flow Store", timezone: "Asia/Karachi", taxRate: 0, cardFee: 0 },
    update: { taxRate: 0, cardFee: 0 },
  });

  const brand = await prisma.brand.create({ data: { name: "FlowBrand" } });
  const category = await prisma.category.create({ data: { name: "Phones", type: "PHONE" } });
  const color = await prisma.color.create({ data: { name: "Black" } });
  const product = await prisma.product.create({
    data: {
      brandId: brand.id,
      model: "Flow X",
      storage: "128GB",
      categoryId: category.id,
      colorId: color.id,
      sku: "FLOW-SKU-1",
      sellPrice: 200000,
      costPrice: 150000,
    },
  });

  const vendor = await prisma.contact.create({
    data: {
      type: "VENDOR",
      name: "Flow Vendor",
      phone: "03000000001",
      creditAccount: { create: { limit: 0, balance: 0 } },
    },
  });

  const customer = await prisma.contact.create({
    data: {
      type: "CUSTOMER",
      name: "Flow Customer",
      phone: "03000000002",
      creditAccount: { create: { limit: 500000, balance: 0 } },
    },
  });

  const bank = await prisma.bankAccount.create({
    data: { name: "Flow Bank", bankName: "FlowBank", accountNo: "12345", companyId: "store" },
  });

  return { product, vendor, customer, bank };
}

export async function addStockUnits(productId: string, count: number, costPrice = 150000, startImei = 100000000000000) {
  const units: { id: string }[] = [];
  for (let i = 0; i < count; i++) {
    const imei = String(startImei + i);
    const unit = await prisma.unit.create({
      data: {
        productId,
        imei,
        condition: "NEW",
        status: "IN_STOCK",
        source: "VENDOR_PURCHASE",
        costPrice,
      },
    });
    units.push({ id: unit.id });
  }
  return units;
}

export function auth(cookie: string) {
  return { Cookie: cookie };
}
