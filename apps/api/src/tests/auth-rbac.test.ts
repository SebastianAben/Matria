import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../db/prisma.js";
import { app, createUserWithRole, login, resetDatabase } from "./test-utils.js";

describe("auth and RBAC", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("logs in, reads the session, and logs out", async () => {
    const user = await createUserWithRole("hospital_admin", "admin");
    const cookie = await login(user.email);

    const session = await request(app).get("/auth/session").set("Cookie", cookie).expect(200);
    expect(session.body.data.user.email).toBe(user.email);
    expect(session.body.data.user.permissions).toContain("admin:users");

    await request(app).post("/auth/logout").set("Cookie", cookie).expect(200);
  });

  it("denies protected routes when unauthenticated", async () => {
    const response = await request(app).get("/admin/users").expect(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("denies missing permissions and records an audit event", async () => {
    const user = await createUserWithRole("auditor", "auditor");
    const cookie = await login(user.email);

    const response = await request(app).get("/admin/users").set("Cookie", cookie).expect(403);
    expect(response.body.error.code).toBe("FORBIDDEN");

    const audit = await prisma.auditLog.findFirst({ where: { action: "permission.denied" } });
    expect(audit?.outcome).toBe("denied");
  });
});
