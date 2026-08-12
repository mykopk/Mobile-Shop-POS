import { afterAll, describe, expect, it, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../core/lib/prisma";
import { login, resetDb, seedCatalog, seedUser } from "./helpers";

const app = createApp();

let cashierCookie = "";
let adminCookie = "";
let managerCookie = "";

describe("permissions", () => {
  beforeAll(async () => {
    await resetDb();
    await seedUser("perm_cashier", "CASHIER");
    await seedUser("perm_admin", "ADMIN");
    await seedUser("perm_manager", "MANAGER");
    await seedCatalog();
    cashierCookie = (await login(app, "perm_cashier")).cookie;
    adminCookie = (await login(app, "perm_admin")).cookie;
    managerCookie = (await login(app, "perm_manager")).cookie;
  });

  const cashier = () => ({ Cookie: cashierCookie });
  const admin = () => ({ Cookie: adminCookie });
  const manager = () => ({ Cookie: managerCookie });

  it("grants granular permission lists per role", async () => {
    const cashierLogin = await login(app, "perm_cashier");
    const adminLogin = await login(app, "perm_admin");
    const managerLogin = await login(app, "perm_manager");

    expect(cashierLogin.user.permissions).toContain("sale.create");
    expect(cashierLogin.user.permissions).toContain("product.view");
    expect(cashierLogin.user.permissions).not.toContain("product.create");
    expect(cashierLogin.user.permissions).not.toContain("user.manage");
    expect(adminLogin.user.permissions).toContain("user.manage");
    expect(adminLogin.user.permissions).toContain("audit.view");
    expect(managerLogin.user.permissions).toContain("product.create");
    expect(managerLogin.user.permissions).not.toContain("user.manage");
    expect(managerLogin.user.permissions).not.toContain("audit.view");
  });

  it("allows cashiers to read products but not write them", async () => {
    const list = await request(app).get("/api/product").set(cashier());
    expect(list.status).toBe(200);

    const create = await request(app)
      .post("/api/product")
      .set(cashier())
      .send({ brandId: "x", model: "Y", categoryId: "x", sku: "SKU-Y", sellPrice: 1, costPrice: 1 });
    expect(create.status).toBe(403);
    expect(create.body.error?.code).toBe("auth.forbidden");
  });

  it("blocks cashiers from purchases, returns, vouchers, expenses and bank accounts", async () => {
    const cases: { url: string; payload?: unknown }[] = [
      { url: "/api/transaction/purchase", payload: { contactId: "x", items: [], payments: [] } },
      { url: "/api/transaction/sale/returns", payload: { saleId: "x", items: [], payments: [] } },
      { url: "/api/transaction/purchase/returns", payload: { purchaseId: "x", unitIds: [], payments: [] } },
      { url: "/api/transaction/returns/x/void" },
      { url: "/api/product/import", payload: { items: [] } },
      { url: "/api/unit/adjust", payload: { unitIds: [], reason: "x" } },
      { url: "/api/voucher", payload: { type: "RECEIVING", amount: 100, method: "CASH" } },
      { url: "/api/voucher/x/reverse", payload: {} },
      { url: "/api/expense", payload: { category: "Rent", amount: 5000 } },
      { url: "/api/bank-account", payload: { name: "a", bankName: "b", accountNo: "c" } },
      { url: "/api/bank-account/x/default" },
      { url: "/api/contact/import", payload: { contacts: [] } },
    ];
    for (const { url, payload } of cases) {
      const res = await request(app).post(url).set(cashier()).send(payload ?? {});
      expect(res.status, `POST ${url}`).toBe(403);
    }
  });

  it("blocks cashiers from profit and stock reports", async () => {
    const profit = await request(app).get("/api/report/profit").set(cashier());
    expect(profit.status).toBe(403);

    const stock = await request(app).get("/api/report/stock").set(cashier());
    expect(stock.status).toBe(403);
  });

  it("allows cashiers to view the overview report", async () => {
    const res = await request(app).get("/api/report/summary").set(cashier());
    expect(res.status).toBe(200);
  });

  it("allows admins to write products and view profit", async () => {
    const brand = await prisma.brand.findFirstOrThrow();
    const category = await prisma.category.findFirstOrThrow();
    const color = await prisma.color.findFirstOrThrow();
    const create = await request(app)
      .post("/api/product")
      .set(admin())
      .send({
        brandId: brand.id,
        model: "Model Y",
        categoryId: category.id,
        sku: "SKU-Y-ADMIN",
        sellPrice: 50000,
        costPrice: 40000,
        colorId: color.id,
      });
    expect(create.status).toBe(201);

    const profit = await request(app).get("/api/report/profit").set(admin());
    expect(profit.status).toBe(200);
  });

  it("allows managers to write products and view profit", async () => {
    const brand = await prisma.brand.findFirstOrThrow();
    const category = await prisma.category.findFirstOrThrow();
    const create = await request(app)
      .post("/api/product")
      .set(manager())
      .send({
        brandId: brand.id,
        model: "Model Z",
        categoryId: category.id,
        sku: "SKU-Z-MANAGER",
        sellPrice: 30000,
        costPrice: 20000,
      });
    expect(create.status).toBe(201);

    const profit = await request(app).get("/api/report/profit").set(manager());
    expect(profit.status).toBe(200);
  });

  it("enforces per-user permissions stored in the database", async () => {
    const list = await request(app).get("/api/user").set(admin());
    expect(list.status).toBe(200);

    const cashierRec = list.body.data.find((u: { username: string }) => u.username === "perm_cashier");
    const adminRec = list.body.data.find((u: { username: string }) => u.username === "perm_admin");
    expect(cashierRec).toBeTruthy();
    expect(adminRec).toBeTruthy();

    const grant = await request(app)
      .put(`/api/user/${cashierRec.id}`)
      .set(admin())
      .send({ permissions: [...cashierRec.permissions, "product.create"] });
    expect(grant.status).toBe(200);

    const brand = await prisma.brand.findFirstOrThrow();
    const category = await prisma.category.findFirstOrThrow();
    const cashierCreate = await request(app)
      .post("/api/product")
      .set(cashier())
      .send({
        brandId: brand.id,
        model: "Granted Model",
        categoryId: category.id,
        sku: "SKU-GRANTED",
        sellPrice: 10000,
        costPrice: 8000,
      });
    expect(cashierCreate.status).toBe(201);

    const revoke = await request(app)
      .put(`/api/user/${adminRec.id}`)
      .set(admin())
      .send({ permissions: adminRec.permissions.filter((p: string) => p !== "sale.create") });
    expect(revoke.status).toBe(200);

    const adminSale = await request(app)
      .post("/api/transaction/sale")
      .set(admin())
      .send({ contactId: "x", items: [], payments: [] });
    expect(adminSale.status).toBe(403);
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
