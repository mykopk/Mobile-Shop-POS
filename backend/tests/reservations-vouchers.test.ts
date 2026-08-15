import { afterAll, describe, expect, it, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../core/lib/prisma";
import { login } from "./helpers";
import { seedScenario, addStockUnits, auth } from "./seed-flows";

const app = createApp();
let cookie = "";
let customerId = "";
let productId = "";
let counter = 900000000000000;

describe("reservation flow", () => {
  beforeAll(async () => {
    const s = await seedScenario();
    customerId = s.customer.id;
    productId = s.product.id;
    cookie = (await login(app, "FLOWS_ADMIN")).cookie;
  });

  function nextImei() {
    counter += 1;
    return String(counter);
  }

  it("creates a reservation, holds the unit as RESERVED, and cancels releasing it", async () => {
    const [unit] = await addStockUnits(productId, 1, 150000, Number(nextImei()));
    const create = await request(app)
      .post("/api/reservation")
      .set(auth(cookie))
      .send({
        contactId: customerId,
        type: "RESERVATION",
        items: [{ productId, unitId: unit.id, quantity: 1, unitPrice: 200000 }],
        advance: 50000,
      });
    expect(create.status).toBe(201);
    const reservationId = create.body.data.id;

    const held = await prisma.unit.findUniqueOrThrow({ where: { id: unit.id } });
    expect(held.status).toBe("RESERVED");

    const cancel = await request(app)
      .post(`/api/reservation/${reservationId}/cancel`)
      .set(auth(cookie))
      .send({ refundNow: false });
    expect(cancel.status).toBe(200);

    const released = await prisma.unit.findUniqueOrThrow({ where: { id: unit.id } });
    expect(released.status).toBe("IN_STOCK");
  });

  it("warns on a reservation conflict when the unit is already reserved", async () => {
    const [unit] = await addStockUnits(productId, 1, 150000, Number(nextImei()));
    const create = await request(app)
      .post("/api/reservation")
      .set(auth(cookie))
      .send({
        contactId: customerId,
        type: "RESERVATION",
        items: [{ productId, unitId: unit.id, quantity: 1, unitPrice: 200000 }],
        advance: 0,
      });
    expect(create.status).toBe(201);

    const other = await prisma.contact.create({
      data: { type: "CUSTOMER", name: "OtherA", phone: "03111111111", creditAccount: { create: { limit: 0, balance: 0 } } },
    });
    const check = await request(app)
      .get(`/api/reservation/check?unitIds=${unit.id}&contactId=${other.id}`)
      .set(auth(cookie));
    expect(check.status).toBe(200);
    expect(Array.isArray(check.body.data)).toBe(true);
    expect(check.body.data.length).toBeGreaterThan(0);
  });

  it("blocks selling a unit that is already reserved for another reservation", async () => {
    const [unit] = await addStockUnits(productId, 1, 150000, Number(nextImei()));
    await request(app).post("/api/reservation").set(auth(cookie)).send({
      contactId: customerId,
      type: "RESERVATION",
      items: [{ productId, unitId: unit.id, quantity: 1, unitPrice: 200000 }],
      advance: 0,
    });
    // another contact
    const other = await prisma.contact.create({
      data: { type: "CUSTOMER", name: "Other", phone: "03111111111", creditAccount: { create: { limit: 0, balance: 0 } } },
    });
    // sale attempt on the RESERVED unit
    const sale = await request(app)
      .post("/api/transaction/sale")
      .set(auth(cookie))
      .send({
        contactId: other.id,
        items: [{ productId, unitId: unit.id, quantity: 1, unitPrice: 200000 }],
        payments: [{ method: "CASH", amount: 200000 }],
      });
    expect(sale.status).toBe(400);
  });
});

describe("voucher and expense idempotency + balance effect", () => {
  beforeAll(async () => {
    const s = await seedScenario();
    customerId = s.customer.id;
    cookie = (await login(app, "FLOWS_ADMIN")).cookie;
  });

  it("CRV voucher reduces the contact's balance and is idempotent", async () => {
    // give the customer a starting balance via credit sale-equivalent accounting
    await prisma.creditAccount.update({
      where: { contactId: customerId },
      data: { balance: 100000 },
    });
    const before = Number((await prisma.creditAccount.findUniqueOrThrow({ where: { contactId: customerId } })).balance);

    const clientRef = `crv-${Date.now()}`;
    const body = { type: "RECEIVING", amount: 40000, method: "CASH", contactId: customerId, clientRef };

    const first = await request(app).post("/api/voucher").set(auth(cookie)).send(body);
    expect(first.status).toBe(201);
    const second = await request(app).post("/api/voucher").set(auth(cookie)).send(body);
    expect(second.body.data.id).toBe(first.body.data.id);

    const after = Number((await prisma.creditAccount.findUniqueOrThrow({ where: { contactId: customerId } })).balance);
    expect(after).toBe(before - 40000);
  });

  it("expense creation is idempotent via clientRef", async () => {
    const clientRef = `exp-${Date.now()}`;
    const body = { category: "RENT", amount: 20000, clientRef };
    const first = await request(app).post("/api/expense").set(auth(cookie)).send(body);
    expect(first.status).toBe(201);
    const second = await request(app).post("/api/expense").set(auth(cookie)).send(body);
    expect(second.body.data.id).toBe(first.body.data.id);
    const count = await prisma.expense.count({ where: { clientRef } });
    expect(count).toBe(1);
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
