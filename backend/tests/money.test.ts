import { afterAll, describe, expect, it, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../core/lib/prisma";
import { login, resetDb, seedCatalog, seedUser } from "./helpers";

const app = createApp();

let cookie = "";

describe("transaction money math", () => {
  beforeAll(async () => {
    await resetDb();
    await seedUser("money_admin", "ADMIN");
    await seedCatalog();
    cookie = (await login(app, "money_admin")).cookie;
  });

  const auth = () => ({ Cookie: cookie });

  it("records a purchase and creates the unit at cost", async () => {
    const { product, contact } = await prisma.product.findFirstOrThrow().then(async (p) => ({
      product: p,
      contact: await prisma.contact.findFirstOrThrow(),
    }));

    const res = await request(app)
      .post("/api/transaction/purchase")
      .set(auth())
      .send({
        contactId: contact.id,
        items: [{ productId: product.id, imei: "999000111222333", costPrice: 75000, quantity: 1, condition: "USED" }],
        payments: [{ method: "CASH", amount: 75000 }],
      });

    expect(res.status).toBe(201);
    expect(Number(res.body.data.total)).toBe(75000);
    expect(res.body.data.status).toBe("PAID");

    const unit = await prisma.unit.findUnique({ where: { imei: "999000111222333" } });
    expect(unit).not.toBeNull();
    expect(unit!.status).toBe("IN_STOCK");
    expect(Number(unit!.costPrice)).toBe(75000);
  });

  it("sells the unit at the agreed price and moves it out of stock", async () => {
    const { product, contact } = await prisma.product.findFirstOrThrow().then(async (p) => ({
      product: p,
      contact: await prisma.contact.findFirstOrThrow(),
    }));
    const unit = await prisma.unit.findFirstOrThrow({ where: { status: "IN_STOCK" } });

    const res = await request(app)
      .post("/api/transaction/sale")
      .set(auth())
      .send({
        contactId: contact.id,
        items: [{ productId: product.id, unitId: unit.id, quantity: 1, unitPrice: 110000 }],
        payments: [{ method: "CASH", amount: 110000 }],
      });

    expect(res.status).toBe(201);
    expect(Number(res.body.data.total)).toBe(110000);
    expect(res.body.data.status).toBe("PAID");

    const after = await prisma.unit.findUniqueOrThrow({ where: { id: unit.id } });
    expect(after.status).toBe("SOLD");
  });

  it("rejects overpayment", async () => {
    const { product, contact } = await prisma.product.findFirstOrThrow().then(async (p) => ({
      product: p,
      contact: await prisma.contact.findFirstOrThrow(),
    }));

    const res = await request(app)
      .post("/api/transaction/sale")
      .set(auth())
      .send({
        contactId: contact.id,
        items: [{ productId: product.id, quantity: 1, unitPrice: 10000 }],
        payments: [{ method: "CASH", amount: 99999 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe("payment.overpaid");
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
