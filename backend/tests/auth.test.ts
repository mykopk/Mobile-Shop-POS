import { afterAll, describe, expect, it, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../core/lib/prisma";
import { login, resetDb, seedUser } from "./helpers";

const app = createApp();

describe("auth", () => {
  beforeAll(async () => {
    await resetDb();
    await seedUser("auth_user", "CASHIER", "1234");
    await seedUser("rate_limited_user", "CASHIER", "1234");
    await seedUser("pin_user", "CASHIER", "1234");
  });

  it("sets a session cookie with role and server-derived permissions on success", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "auth_user", pin: "1234" });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeUndefined();
    const setCookie = res.headers["set-cookie"] as unknown as string[];
    expect(setCookie.some((c) => c.includes("fig.session"))).toBe(true);
    expect(res.body.data.user.role).toBe("CASHIER");
    expect(res.body.data.user.permissions).toContain("sale.create");
    expect(res.body.data.user.permissions).toContain("payment.collect");
    expect(res.body.data.user.permissions).toContain("product.view");
    expect(res.body.data.user.permissions).not.toContain("product.create");
    expect(res.body.data.user.permissions).not.toContain("user.manage");
  });

  it("rejects an invalid PIN with 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "auth_user", pin: "9999" });

    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe("auth.invalid_credentials");
  });

  it("rate-limits repeated failures to the same username", async () => {
    let last: request.Response | undefined;
    for (let i = 0; i < 5; i++) {
      last = await request(app)
        .post("/api/auth/login")
        .send({ username: "rate_limited_user", pin: "9999" });
    }
    expect(last?.status).toBe(401);

    const blocked = await request(app)
      .post("/api/auth/login")
      .send({ username: "rate_limited_user", pin: "1234" });
    expect(blocked.status).toBe(429);
    expect(blocked.body.error?.code).toBe("auth.rate_limited");
  });

  it("requires a valid PIN even when username matches", async () => {
    const res = await login(app, "auth_user", "1234");
    expect(res.cookie).toBeTruthy();
  });

  it("returns the current user from /me with a session cookie", async () => {
    const { cookie } = await login(app, "auth_user", "1234");
    const res = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.user.username).toBe("AUTH_USER");
    expect(res.body.data.user.permissions).toContain("sale.create");
  });

  it("rejects /me without a session", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("clears the session cookie on logout", async () => {
    const { cookie } = await login(app, "auth_user", "1234");
    const res = await request(app).post("/api/auth/logout").set("Cookie", cookie);
    expect(res.status).toBe(200);
    const cleared = res.headers["set-cookie"] as unknown as string[];
    expect(cleared.some((c) => c.includes("fig.session") && (c.includes("Max-Age=0") || c.includes("Expires=")))).toBe(true);
  });

  it("changes the PIN when the current PIN is correct", async () => {
    const { cookie } = await login(app, "pin_user", "1234");
    const res = await request(app)
      .put("/api/auth/pin")
      .set("Cookie", cookie)
      .send({ currentPin: "1234", newPin: "9999" });
    expect(res.status).toBe(200);
    expect(res.body.data.ok).toBe(true);
  });

  it("rejects a PIN change with the wrong current PIN", async () => {
    const { cookie } = await login(app, "pin_user", "9999");
    const res = await request(app)
      .put("/api/auth/pin")
      .set("Cookie", cookie)
      .send({ currentPin: "1111", newPin: "0000" });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe("auth.pin_incorrect");
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
