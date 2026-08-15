import { afterAll, describe, expect, it, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../core/lib/prisma";
import { login } from "./helpers";
import { seedScenario, auth } from "./seed-flows";

const app = createApp();
let cookie = "";
let vendorId = "";
let productId = "";

describe("purchase order flow", () => {
  beforeAll(async () => {
    const s = await seedScenario();
    vendorId = s.vendor.id;
    productId = s.product.id;
    cookie = (await login(app, "FLOWS_ADMIN")).cookie;
  });

  it("creates an order, receives part, then the rest, and records stock + a purchase", async () => {
    const create = await request(app)
      .post("/api/purchase-order")
      .set(auth(cookie))
      .send({
        contactId: vendorId,
        items: [{ productId, quantity: 5, costPrice: 1000 }],
      });
    expect(create.status).toBe(201);
    const order = create.body.data;
    expect(order.status).toBe("PENDING");
    const itemId = order.items[0].id;

    // receive 2 of 5
    const partial = await request(app)
      .post(`/api/purchase-order/${order.id}/receive`)
      .set(auth(cookie))
      .send({ items: [{ itemId, quantity: 2 }] });
    expect(partial.status).toBe(200);
    expect(partial.body.data.status).toBe("PARTIAL");

    // a purchase transaction + stock movement was created
    const purchase = await prisma.transaction.findFirstOrThrow({ where: { note: { contains: order.number } } });
    expect(purchase.type).toBe("PURCHASE");
    expect(Number(purchase.total)).toBe(2000);
    const movement = await prisma.stockMovement.findFirstOrThrow({
      where: { productId, type: "IN", note: { contains: order.number } },
    });
    expect(movement.qty).toBe(2);

    // receive remaining 3
    const full = await request(app)
      .post(`/api/purchase-order/${order.id}/receive`)
      .set(auth(cookie))
      .send({ items: [{ itemId, quantity: 3 }] });
    expect(full.status).toBe(200);
    expect(full.body.data.status).toBe("RECEIVED");

    // cannot receive more
    const over = await request(app)
      .post(`/api/purchase-order/${order.id}/receive`)
      .set(auth(cookie))
      .send({ items: [{ itemId, quantity: 1 }] });
    expect(over.status).toBe(400);
  });

  it("rejects receiving more than ordered on one line", async () => {
    const create = await request(app)
      .post("/api/purchase-order")
      .set(auth(cookie))
      .send({
        contactId: vendorId,
        items: [{ productId, quantity: 2, costPrice: 1000 }],
      });
    const itemId = create.body.data.items[0].id;
    const over = await request(app)
      .post(`/api/purchase-order/${create.body.data.id}/receive`)
      .set(auth(cookie))
      .send({ items: [{ itemId, quantity: 3 }] });
    expect(over.status).toBe(400);
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
