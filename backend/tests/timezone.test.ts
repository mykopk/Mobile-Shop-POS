import { afterAll, describe, expect, it, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../core/lib/prisma";
import { login, resetDb, seedCatalog, seedCompanyProfile, seedUser } from "./helpers";

const app = createApp();

let cookie = "";

function makeSale(tx: {
  contactId: string;
  userId: string;
  createdAt: string;
  total: number;
  number: string;
}) {
  return prisma.transaction.create({
    data: {
      type: "SALE",
      number: tx.number,
      contactId: tx.contactId,
      userId: tx.userId,
      subtotal: tx.total,
      discount: 0,
      total: tx.total,
      status: "PAID",
      createdAt: new Date(tx.createdAt),
      payments: { create: [{ method: "CASH", amount: tx.total }] },
    },
  });
}

describe("timezone day bucketing", () => {
  beforeAll(async () => {
    await resetDb();
    const admin = await seedUser("tz_admin", "ADMIN");
    const { product, contact } = await seedCatalog();
    await seedCompanyProfile("Asia/Karachi");
    cookie = (await login(app, "tz_admin")).cookie;

    await makeSale({
      contactId: contact.id,
      userId: admin.id,
      number: "SAL-TZ-1",
      createdAt: "2026-08-11T19:30:00.000Z", // 00:30 PKR on Aug 12
      total: 1000,
    });
    await makeSale({
      contactId: contact.id,
      userId: admin.id,
      number: "SAL-TZ-2",
      createdAt: "2026-08-12T18:00:00.000Z", // 23:00 PKR on Aug 12
      total: 2000,
    });
    await makeSale({
      contactId: contact.id,
      userId: admin.id,
      number: "SAL-TZ-3",
      createdAt: "2026-08-12T20:30:00.000Z", // 01:30 PKR on Aug 13
      total: 4000,
    });
    void product;
  });

  it("buckets 00:30 PKR sales into the PKR day, not the UTC day", async () => {
    const res = await request(app)
      .get("/api/report/sales?from=2026-08-12&to=2026-08-12")
      .set({ Cookie: cookie });

    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(2);
    expect(Number(res.body.data.revenue)).toBe(3000);
  });

  it("excludes them from the previous UTC day", async () => {
    const res = await request(app)
      .get("/api/report/sales?from=2026-08-11&to=2026-08-11")
      .set({ Cookie: cookie });

    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(0);
    expect(Number(res.body.data.revenue)).toBe(0);
  });

  it("buckets 01:30 PKR on Aug 13 into Aug 13", async () => {
    const res = await request(app)
      .get("/api/report/sales?from=2026-08-13&to=2026-08-13")
      .set({ Cookie: cookie });

    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(1);
    expect(Number(res.body.data.revenue)).toBe(4000);
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
