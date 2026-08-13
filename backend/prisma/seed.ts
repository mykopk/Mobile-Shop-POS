import bcrypt from "bcryptjs";
import { env } from "../core/config/env";
import { prisma } from "../core/lib/prisma";
import { formatSku, nextSkuNumber } from "../core/lib/sku";
import type { ContactType, Role } from "../generated/prisma/enums";

const RESET = process.argv.includes("--reset");

if (process.env.NODE_ENV === "production" && !process.argv.includes("--force")) {
  console.log("Seeding is disabled in production. Re-run with --force to override.");
  process.exit(0);
}

const DEMO_USERS: {
  username: string;
  name: string;
  email: string;
  pin: string;
  role: Role;
}[] = [
  {
    username: "ARSLAN",
    name: "Arslan Wahab",
    email: "admin@fig.com",
    pin: "1111",
    role: "ADMIN",
  },
  {
    username: "SAIMA",
    name: "Saima Riaz",
    email: "manager@fig.com",
    pin: "2222",
    role: "MANAGER",
  },
  {
    username: "ALI",
    name: "Ali Hassan",
    email: "cashier@fig.com",
    pin: "3333",
    role: "CASHIER",
  },
];

const DEMO_CONTACTS = [
  {
    type: "CUSTOMER",
    name: "Muhammad Imran",
    phone: "03001234567",
    email: "imran@example.com",
    address: "Karachi",
    notes: "Regular buyer",
  },
  {
    type: "VENDOR",
    name: "Sana Traders",
    phone: "03009876543",
    address: "Saddar, Karachi",
    notes: "Wholesale supplier",
  },
  {
    type: "WALK_IN",
    name: "Aamir Khan",
    phone: "03312345678",
    notes: "Walk-in",
  },
];

const DEMO_CATEGORIES: {
  id: string;
  name: string;
  type: "PHONE" | "ACCESSORY";
  sortOrder: number;
}[] = [
  { id: "cat-phone-new", name: "New Phone", type: "PHONE", sortOrder: 1 },
  { id: "cat-phone-used", name: "Used Phone", type: "PHONE", sortOrder: 2 },
  { id: "cat-accessory", name: "Accessory", type: "ACCESSORY", sortOrder: 3 },
];

const DEMO_BRANDS: {
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

const DEMO_COLORS = [
  "Black",
  "Midnight",
  "Midnight Black",
  "Phantom Black",
  "Aura Black",
  "Space Grey",
  "Graphite",
  "Grey",
  "Silver",
  "Starlight",
  "White",
  "Pearl White",
  "Cream",
  "Beige",
  "Sand",
  "Gold",
  "Rose Gold",
  "Rose Pink",
  "Pink",
  "Soft Pink",
  "Coral",
  "Red",
  "Product Red",
  "Burgundy",
  "Maroon",
  "Orange",
  "Sunset Orange",
  "Yellow",
  "Lime",
  "Green",
  "Mint",
  "Mint Green",
  "Sage Green",
  "Alpine Green",
  "Emerald",
  "Teal",
  "Aqua",
  "Blue",
  "Deep Blue",
  "Pacific Blue",
  "Sierra Blue",
  "Ocean Blue",
  "Ice Blue",
  "Denim",
  "Navy",
  "Sky Blue",
  "Ultramarine",
  "Purple",
  "Deep Purple",
  "Lavender",
  "Violet",
  "Lilac",
  "Grape",
  "Titanium",
  "Natural Titanium",
  "Blue Titanium",
  "White Titanium",
  "Black Titanium",
  "Desert Titanium",
  "Titanium Grey",
  "Brown",
  "Tan",
  "Walnut",
  "Silver Blue",
  "Aura Glow",
  "Aura White",
  "Aura Pink",
  "Glacier",
  "Sandstone",
  "Matte Black",
  "Matte White",
  "Carbon",
  "Awesome Black",
  "Force Black",
  "Galactic Silver",
  "Multi",
  "Other",
];

const DEMO_PRODUCTS: {
  brandId: string;
  model: string;
  storage?: string;
  ram?: string;
  screenSize?: string;
  colorId?: string;
  categoryId: string;
  sellPrice: number;
  costPrice: number;
  retailPrice?: number;
}[] = [
  { brandId: "brand-apple", model: "iPhone 14", storage: "128GB", ram: "6GB", screenSize: '6.1"', colorId: "color-midnight", categoryId: "cat-phone-new", sellPrice: 235000, costPrice: 218000, retailPrice: 245000 },
  { brandId: "brand-apple", model: "iPhone 14", storage: "128GB", ram: "6GB", screenSize: '6.1"', colorId: "color-midnight", categoryId: "cat-phone-used", sellPrice: 200000, costPrice: 190000, retailPrice: 245000 },
  { brandId: "brand-apple", model: "iPhone 13", storage: "128GB", ram: "4GB", screenSize: '6.1"', colorId: "color-starlight", categoryId: "cat-phone-used", sellPrice: 178000, costPrice: 165000, retailPrice: 185000 },
  { brandId: "brand-samsung", model: "Galaxy A54", storage: "256GB", ram: "8GB", screenSize: '6.4"', colorId: "color-awesome-black", categoryId: "cat-phone-new", sellPrice: 124000, costPrice: 116000, retailPrice: 128000 },
  { brandId: "brand-infinix", model: "Note 12", storage: "128GB", ram: "6GB", screenSize: '6.7"', colorId: "color-force-black", categoryId: "cat-phone-used", sellPrice: 65500, costPrice: 61000 },
  { brandId: "brand-oneplus", model: "11R", storage: "256GB", ram: "12GB", screenSize: '6.7"', colorId: "color-galactic-silver", categoryId: "cat-phone-new", sellPrice: 142000, costPrice: 134000 },
  { brandId: "brand-generic", model: "Silicone Case iPhone 14", categoryId: "cat-accessory", sellPrice: 800, costPrice: 350 },
  { brandId: "brand-apple", model: "iPhone 15 Pro", storage: "256GB", ram: "8GB", screenSize: '6.1"', colorId: "color-natural-titanium", categoryId: "cat-phone-new", sellPrice: 389000, costPrice: 372000, retailPrice: 399000 },
  { brandId: "brand-apple", model: "iPhone 15", storage: "128GB", ram: "6GB", screenSize: '6.1"', colorId: "color-pink", categoryId: "cat-phone-new", sellPrice: 298000, costPrice: 283000, retailPrice: 305000 },
  { brandId: "brand-samsung", model: "Galaxy S24 Ultra", storage: "512GB", ram: "12GB", screenSize: '6.8"', colorId: "color-titanium-grey", categoryId: "cat-phone-new", sellPrice: 415000, costPrice: 398000, retailPrice: 425000 },
  { brandId: "brand-samsung", model: "Galaxy A05", storage: "128GB", ram: "4GB", screenSize: '6.7"', colorId: "color-black", categoryId: "cat-phone-new", sellPrice: 28500, costPrice: 26000, retailPrice: 30000 },
  { brandId: "brand-xiaomi", model: "Redmi Note 13", storage: "256GB", ram: "8GB", screenSize: '6.7"', colorId: "color-mint-green", categoryId: "cat-phone-new", sellPrice: 56000, costPrice: 52000, retailPrice: 58000 },
  { brandId: "brand-oppo", model: "Reno 11F", storage: "256GB", ram: "8GB", screenSize: '6.7"', colorId: "color-lime", categoryId: "cat-phone-new", sellPrice: 74000, costPrice: 69500, retailPrice: 77000 },
  { brandId: "brand-vivo", model: "Y28", storage: "128GB", ram: "8GB", screenSize: '6.7"', colorId: "color-pearl-white", categoryId: "cat-phone-new", sellPrice: 43000, costPrice: 40000 },
  { brandId: "brand-infinix", model: "Hot 40i", storage: "128GB", ram: "8GB", screenSize: '6.6"', colorId: "color-blue", categoryId: "cat-phone-new", sellPrice: 31000, costPrice: 28500 },
  { brandId: "brand-oppo", model: "A78", storage: "128GB", ram: "8GB", screenSize: '6.4"', colorId: "color-emerald", categoryId: "cat-phone-new", sellPrice: 54000, costPrice: 50500 },
  { brandId: "brand-apple", model: "iPhone 12", storage: "64GB", ram: "4GB", screenSize: '6.1"', colorId: "color-pacific-blue", categoryId: "cat-phone-used", sellPrice: 125000, costPrice: 112000, retailPrice: 130000 },
  { brandId: "brand-apple", model: "iPhone 11", storage: "128GB", ram: "4GB", screenSize: '6.1"', colorId: "color-purple", categoryId: "cat-phone-used", sellPrice: 105000, costPrice: 94000 },
  { brandId: "brand-samsung", model: "Galaxy S21 FE", storage: "128GB", ram: "8GB", screenSize: '6.4"', colorId: "color-lavender", categoryId: "cat-phone-used", sellPrice: 98000, costPrice: 88000 },
  { brandId: "brand-samsung", model: "Galaxy A14", storage: "128GB", ram: "4GB", screenSize: '6.6"', colorId: "color-silver", categoryId: "cat-phone-used", sellPrice: 24500, costPrice: 21500 },
  { brandId: "brand-samsung", model: "Galaxy Z Flip 5", storage: "256GB", ram: "8GB", screenSize: '6.7"', colorId: "color-mint", categoryId: "cat-phone-used", sellPrice: 238000, costPrice: 221000 },
  { brandId: "brand-oneplus", model: "9", storage: "128GB", ram: "8GB", screenSize: '6.5"', colorId: "color-sierra-blue", categoryId: "cat-phone-used", sellPrice: 88000, costPrice: 79000 },
  { brandId: "brand-xiaomi", model: "Poco X5", storage: "256GB", ram: "8GB", screenSize: '6.6"', colorId: "color-teal", categoryId: "cat-phone-used", sellPrice: 52000, costPrice: 47000 },
  { brandId: "brand-vivo", model: "V29", storage: "256GB", ram: "12GB", screenSize: '6.7"', colorId: "color-rose-gold", categoryId: "cat-phone-used", sellPrice: 101000, costPrice: 91000 },
  { brandId: "brand-infinix", model: "Note 30", storage: "256GB", ram: "8GB", screenSize: '6.7"', colorId: "color-yellow", categoryId: "cat-phone-used", sellPrice: 47500, costPrice: 43000 },
];

const DEMO_UNITS: {
  imei: string;
  productKey: string;
  condition: "NEW" | "USED";
  costPrice: number;
  grade?: string;
  carrier?: "NON_PTA" | "PTA" | "SIM_LOCKED";
  batteryHealth?: number;
}[] = [
  { imei: "350014001234560", productKey: "iPhone 14 128GB NEW", condition: "NEW", costPrice: 218000, carrier: "PTA" },
  { imei: "350014001234561", productKey: "iPhone 14 128GB NEW", condition: "NEW", costPrice: 218000, carrier: "PTA" },
  { imei: "350014001234562", productKey: "iPhone 13 128GB USED", condition: "USED", costPrice: 145000, grade: "A", carrier: "PTA", batteryHealth: 89 },
  { imei: "350014001234563", productKey: "Galaxy A54 256GB NEW", condition: "NEW", costPrice: 116000, carrier: "PTA" },
  { imei: "350014001234564", productKey: "Note 12 128GB USED", condition: "USED", costPrice: 47000, grade: "B", carrier: "NON_PTA", batteryHealth: 82 },
  { imei: "350014001234565", productKey: "iPhone 14 128GB USED", condition: "USED", costPrice: 165000, grade: "A", carrier: "SIM_LOCKED", batteryHealth: 95 },
  { imei: "350015001234560", productKey: "iPhone 15 Pro 256GB NEW", condition: "NEW", costPrice: 372000, carrier: "PTA" },
  { imei: "350015001234561", productKey: "iPhone 15 128GB NEW", condition: "NEW", costPrice: 283000, carrier: "NON_PTA" },
  { imei: "351024001234560", productKey: "Galaxy S24 Ultra 512GB NEW", condition: "NEW", costPrice: 398000, carrier: "PTA" },
  { imei: "351024001234561", productKey: "Galaxy A05 128GB NEW", condition: "NEW", costPrice: 26000, carrier: "PTA" },
  { imei: "352123001234560", productKey: "Redmi Note 13 256GB NEW", condition: "NEW", costPrice: 52000, carrier: "PTA" },
  { imei: "353456001234560", productKey: "Reno 11F 256GB NEW", condition: "NEW", costPrice: 69500, carrier: "PTA" },
  { imei: "350014001234566", productKey: "iPhone 12 64GB USED", condition: "USED", costPrice: 112000, grade: "A", carrier: "PTA", batteryHealth: 90 },
  { imei: "350014001234567", productKey: "iPhone 11 128GB USED", condition: "USED", costPrice: 94000, grade: "B", carrier: "NON_PTA", batteryHealth: 84 },
  { imei: "351024001234562", productKey: "Galaxy S21 FE 128GB USED", condition: "USED", costPrice: 88000, grade: "A", carrier: "PTA", batteryHealth: 92 },
  { imei: "351024001234563", productKey: "Galaxy Z Flip 5 256GB USED", condition: "USED", costPrice: 221000, grade: "B", carrier: "SIM_LOCKED", batteryHealth: 96 },
  { imei: "352456001234560", productKey: "9 128GB USED", condition: "USED", costPrice: 79000, grade: "C", carrier: "NON_PTA", batteryHealth: 78 },
  { imei: "352123001234561", productKey: "Poco X5 256GB USED", condition: "USED", costPrice: 47000, grade: "B", carrier: "PTA", batteryHealth: 81 },
];

const DEMO_PURCHASES: {
  contactId: string;
  note: string;
  imeis: string[];
}[] = [
  {
    contactId: "seed-Sana Traders",
    note: "Initial stock — new iPhone handsets",
    imeis: [
      "350014001234560",
      "350014001234561",
      "350015001234560",
      "350015001234561",
    ],
  },
  {
    contactId: "seed-Sana Traders",
    note: "Initial stock — new Android handsets",
    imeis: [
      "350014001234563",
      "351024001234560",
      "351024001234561",
      "352123001234560",
      "353456001234560",
    ],
  },
  {
    contactId: "seed-Aamir Khan",
    note: "Trade-ins — used Apple devices",
    imeis: [
      "350014001234562",
      "350014001234564",
      "350014001234565",
      "350014001234566",
      "350014001234567",
    ],
  },
  {
    contactId: "seed-Aamir Khan",
    note: "Trade-ins — used Android devices",
    imeis: [
      "351024001234562",
      "351024001234563",
      "352456001234560",
      "352123001234561",
    ],
  },
];

const DEMO_SALES: {
  contactId: string;
  note: string;
  discount: number;
  imeis: string[];
}[] = [
  {
    contactId: "seed-Muhammad Imran",
    note: "New device purchase",
    discount: 5000,
    imeis: ["350014001234560", "350015001234560"],
  },
  {
    contactId: "seed-Aamir Khan",
    note: "Walk-in customer",
    discount: 0,
    imeis: ["351024001234560"],
  },
  {
    contactId: "seed-Muhammad Imran",
    note: "Used phone sale",
    discount: 2000,
    imeis: ["350014001234566"],
  },
];

async function resetAll() {
  const order = [
    prisma.transactionItem.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.transaction.deleteMany(),
    prisma.stockMovement.deleteMany(),
    prisma.unit.deleteMany(),
    prisma.productPriceHistory.deleteMany(),
    prisma.product.deleteMany(),
    prisma.creditPayment.deleteMany(),
    prisma.creditAccount.deleteMany(),
    prisma.expense.deleteMany(),
    prisma.contact.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.dashboardWidget.deleteMany(),
    prisma.user.deleteMany(),
    prisma.bankAccount.deleteMany(),
    prisma.settings.deleteMany(),
    prisma.companyProfile.deleteMany(),
    prisma.color.deleteMany(),
    prisma.brand.deleteMany(),
    prisma.category.deleteMany(),
  ];
  for (const op of order) {
    await op;
  }
  console.log("Reset: all existing data deleted.");
}

async function main() {
  if (RESET) {
    await resetAll();
  }

  for (const demo of DEMO_USERS) {
    const pinHash = await bcrypt.hash(demo.pin, env.BCRYPT_ROUNDS);
    await prisma.user.upsert({
      where: { username: demo.username },
      update: {
        name: demo.name,
        email: demo.email,
        pinHash,
        role: demo.role,
        active: true,
      },
      create: {
        username: demo.username,
        name: demo.name,
        email: demo.email,
        pinHash,
        role: demo.role,
      },
    });
  }

  for (const c of DEMO_CONTACTS) {
    await prisma.contact.upsert({
      where: { id: `seed-${c.name}` },
      update: {},
      create: {
        id: `seed-${c.name}`,
        type: c.type as ContactType,
        name: c.name,
        phone: c.phone,
        email: c.email,
        address: c.address,
        notes: c.notes,
        creditAccount: {
          create: {
            id: `seed-ca-${c.name}`,
            limit: 0,
            balance: 0,
          },
        },
      },
    });
  }

  for (const cat of DEMO_CATEGORIES) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: { name: cat.name, type: cat.type, sortOrder: cat.sortOrder, active: true },
      create: {
        id: cat.id,
        name: cat.name,
        type: cat.type,
        sortOrder: cat.sortOrder,
        active: true,
      },
    });
  }

  for (const brand of DEMO_BRANDS) {
    await prisma.brand.upsert({
      where: { id: brand.id },
      update: { name: brand.name, sortOrder: brand.sortOrder, active: true },
      create: {
        id: brand.id,
        name: brand.name,
        sortOrder: brand.sortOrder,
        active: true,
      },
    });
  }

  let colorSortOrder = 0;
  for (const name of DEMO_COLORS) {
    const id = `color-${name.toLowerCase().replace(/\s+/g, "-")}`;
    await prisma.color.upsert({
      where: { id },
      update: { name, active: true },
      create: {
        id,
        name,
        sortOrder: colorSortOrder++,
        active: true,
      },
    });
  }

  const existingSkus = await prisma.product.findMany({ select: { sku: true } });
  let skuCounter = nextSkuNumber(existingSkus.map((p) => p.sku));

  for (const p of DEMO_PRODUCTS) {
    const existing = await prisma.product.findFirst({
      where: {
        brandId: p.brandId,
        model: p.model,
        storage: p.storage ?? null,
        colorId: p.colorId ?? null,
        categoryId: p.categoryId,
      },
    });
    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          storage: p.storage,
          ram: p.ram,
          screenSize: p.screenSize,
          colorId: p.colorId,
          sellPrice: p.sellPrice,
          costPrice: p.costPrice,
          retailPrice: p.retailPrice ?? null,
        },
      });
      continue;
    }
    const sku = formatSku(skuCounter++);
    await prisma.product.create({
      data: {
        sku,
        brandId: p.brandId,
        model: p.model,
        storage: p.storage,
        ram: p.ram,
        screenSize: p.screenSize,
        colorId: p.colorId,
        categoryId: p.categoryId,
        sellPrice: p.sellPrice,
        costPrice: p.costPrice,
        retailPrice: p.retailPrice ?? null,
        priceHistory: {
          create: {
            sellPrice: p.sellPrice,
            costPrice: p.costPrice,
          },
        },
      },
    });
  }

  const products = await prisma.product.findMany({
    include: { units: true, category: { select: { name: true } } },
  });
  const keyToProduct = new Map(
    products.map((p) => [
      p.category.name === "Accessory"
        ? p.model
        : `${p.model} ${p.storage ?? ""} ${p.category.name === "Used Phone" ? "USED" : "NEW"}`.trim(),
      p,
    ]),
  );

  for (const u of DEMO_UNITS) {
    const product = keyToProduct.get(u.productKey);
    if (!product) continue;
    await prisma.unit.upsert({
      where: { imei: u.imei },
      update: {
        condition: u.condition,
        status: "IN_STOCK",
        carrier: u.carrier ?? "PTA",
        batteryHealth: u.batteryHealth,
        costPrice: u.costPrice,
        grade: u.grade,
      },
      create: {
        productId: product.id,
        imei: u.imei,
        condition: u.condition,
        status: "IN_STOCK",
        source: u.condition === "USED" ? "BOUGHT_WALKIN" : "VENDOR_PURCHASE",
        carrier: u.carrier ?? "PTA",
        batteryHealth: u.batteryHealth,
        costPrice: u.costPrice,
        grade: u.grade,
      },
    });
  }

  const admin = await prisma.user.findUnique({ where: { username: "ARSLAN" } });
  const allUnits = await prisma.unit.findMany({
    include: { items: { include: { transaction: true } }, product: true },
  });
  const byImei = new Map(allUnits.map((u) => [u.imei, u]));

  let purchaseIndex = 1;
  let purchasesCreated = 0;
  for (const group of DEMO_PURCHASES) {
    const units = group.imeis
      .map((imei) => byImei.get(imei))
      .filter(
        (u): u is NonNullable<typeof u> =>
          !!u && !u.items.some((i) => i.transaction.type === "PURCHASE"),
      );
    if (units.length === 0 || !admin) continue;

    const subtotal = units.reduce((sum, u) => sum + Number(u.costPrice), 0);
    const number = `PUR-${String(purchaseIndex).padStart(4, "0")}`;
    purchaseIndex++;

    const transaction = await prisma.transaction.create({
      data: {
        type: "PURCHASE",
        number,
        contactId: group.contactId,
        userId: admin.id,
        subtotal,
        discount: 0,
        total: subtotal,
        status: "PAID",
        note: group.note,
      },
    });

    for (const u of units) {
      await prisma.transactionItem.create({
        data: {
          transactionId: transaction.id,
          productId: u.productId,
          unitId: u.id,
          quantity: 1,
          unitPrice: u.costPrice,
          discount: 0,
          total: u.costPrice,
        },
      });
      await prisma.stockMovement.create({
        data: { unitId: u.id, productId: u.productId, type: "IN", note: "Purchased" },
      });
    }

    await prisma.payment.create({
      data: {
        transactionId: transaction.id,
        method: "CASH",
        amount: subtotal,
        reference: `Payment ${number}`,
      },
    });

    purchasesCreated++;
  }

  let saleIndex = 1;
  let salesCreated = 0;
  for (const group of DEMO_SALES) {
    const units = group.imeis
      .map((imei) => byImei.get(imei))
      .filter((u): u is NonNullable<typeof u> => !!u && u.status === "IN_STOCK");
    if (units.length === 0 || !admin) continue;

    const subtotal = units.reduce((sum, u) => sum + Number(u.product.sellPrice), 0);
    const total = subtotal - group.discount;
    const number = `SAL-${String(saleIndex).padStart(4, "0")}`;

    const transaction = await prisma.transaction.create({
      data: {
        type: "SALE",
        number,
        contactId: group.contactId,
        userId: admin.id,
        subtotal,
        discount: group.discount,
        total,
        status: "PAID",
        note: group.note,
      },
    });

    for (const u of units) {
      await prisma.transactionItem.create({
        data: {
          transactionId: transaction.id,
          productId: u.productId,
          unitId: u.id,
          quantity: 1,
          unitPrice: u.product.sellPrice,
          discount: 0,
          total: u.product.sellPrice,
        },
      });
      await prisma.unit.update({
        where: { imei: u.imei },
        data: { status: "SOLD" },
      });
      await prisma.stockMovement.create({
        data: { unitId: u.id, productId: u.productId, type: "OUT", note: "Sold" },
      });
    }

    const isBankTransfer = saleIndex === 2;
    const cashPortion = isBankTransfer ? 0 : Math.round(total * 0.7);
    await prisma.payment.create({
      data: {
        transactionId: transaction.id,
        method: "CASH",
        amount: cashPortion,
        reference: `Cash payment ${number}`,
      },
    });
    if (cashPortion < total) {
      await prisma.payment.create({
        data: {
          transactionId: transaction.id,
          method: isBankTransfer ? "BANK_TRANSFER" : "CARD",
          amount: total - cashPortion,
          reference: isBankTransfer ? `Bank transfer ${number}` : `Card payment ${number}`,
        },
      });
    }

    saleIndex++;
    salesCreated++;
  }

  const DEMO_BANK_ACCOUNTS = [
    {
      id: "seed-bank-meezan",
      name: "Meezan - Business",
      bankName: "Meezan Bank",
      accountNo: "0001-1234567",
      holderName: "Fig Mobile",
      iban: "PK36MEZN0001001234567",
      isDefault: true,
    },
    {
      id: "seed-bank-hbl",
      name: "HBL - Current",
      bankName: "HBL",
      accountNo: "00879001012345",
      holderName: "Fig Mobile",
      iban: "PK06HABB00079010012345",
    },
    {
      id: "seed-bank-jazzcash",
      name: "JazzCash - Personal",
      bankName: "JazzCash",
      accountNo: "0300-1234567",
      holderName: "Arslan Wahab",
    },
  ];

  for (const account of DEMO_BANK_ACCOUNTS) {
    await prisma.bankAccount.upsert({
      where: { id: account.id },
      update: { companyId: "store" },
      create: {
        ...account,
        companyId: "store",
        active: true,
      },
    });
  }

  await prisma.companyProfile.upsert({
    where: { id: "store" },
    update: {},
    create: {
      id: "store",
      name: "Fig Mobile",
      tagline: "Point of Sale for mobile phone shops",
      address: "Karachi, Pakistan",
      phone: "0300-1234567",
      currency: "PKR",
      footerText: "Thank you for choosing us. We appreciate your business.",
    },
  });

  console.log(
    `Seeded ${DEMO_USERS.length} users, ${DEMO_CONTACTS.length} contacts, ${DEMO_PRODUCTS.length} products, ${DEMO_UNITS.length} units, ${purchasesCreated} purchase records, ${salesCreated} sale records.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
