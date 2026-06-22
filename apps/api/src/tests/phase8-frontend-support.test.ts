import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../db/prisma.js";
import {
  app,
  createScopedEncounter,
  createUserWithRole,
  login,
  resetDatabase
} from "./test-utils.js";

describe("Phase 8 frontend support routes", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("lists patient encounters and returns an aggregate workspace state", async () => {
    const user = await createUserWithRole("clinician", "phase8-workspace");
    const cookie = await login(user.email);
    const scoped = await createScopedEncounter(cookie);

    await request(app)
      .post(`/encounters/${scoped.encounterId}/consents`)
      .set("Cookie", cookie)
      .send({ mode: "ai", status: "granted" })
      .expect(201);

    const patientEncounters = await request(app)
      .get(`/patients/${scoped.patientId}/encounters`)
      .set("Cookie", cookie)
      .expect(200);
    expect(patientEncounters.body.data.encounters[0].id).toBe(scoped.encounterId);

    const workspace = await request(app)
      .get(`/encounters/${scoped.encounterId}/workspace-state`)
      .set("Cookie", cookie)
      .expect(200);
    expect(workspace.body.data.encounter.id).toBe(scoped.encounterId);
    expect(workspace.body.data.consentRecords).toHaveLength(1);
    expect(workspace.body.data.recentActivity).toBeDefined();
  });

  it("persists approve, edit, reject, and uncertain generated-output decisions", async () => {
    const user = await createUserWithRole("clinician", "phase8-approval");
    const cookie = await login(user.email);
    const outputIds = await seedGeneratedOutputs(cookie);

    await request(app)
      .post(`/outputs/${outputIds[0]}/approve`)
      .set("Cookie", cookie)
      .send({ note: "Reviewed." })
      .expect(200);
    await request(app)
      .post(`/outputs/${outputIds[1]}/edit`)
      .set("Cookie", cookie)
      .send({ note: "Edited.", editedContent: { summary: "Clinician edited summary." } })
      .expect(200);
    await request(app)
      .post(`/outputs/${outputIds[2]}/reject`)
      .set("Cookie", cookie)
      .send({ note: "Not clinically supported." })
      .expect(200);
    await request(app)
      .post(`/outputs/${outputIds[3]}/mark-uncertain`)
      .set("Cookie", cookie)
      .send({ note: "Needs follow-up." })
      .expect(200);

    const outputs = await prisma.generatedOutput.findMany({ orderBy: { createdAt: "asc" } });
    expect(outputs.map((output) => output.status)).toEqual([
      "approved",
      "edited",
      "rejected",
      "uncertain"
    ]);
    expect(await prisma.clinicalApproval.count()).toBe(4);
    expect(await prisma.auditLog.count({ where: { action: { startsWith: "generated_output." } } })).toBe(4);
  });

  it("denies output approval to nurse, lab, and auditor roles", async () => {
    const clinician = await createUserWithRole("clinician", "phase8-deny-owner");
    const clinicianCookie = await login(clinician.email);
    const [outputId] = await seedGeneratedOutputs(clinicianCookie);

    for (const role of ["nurse_midwife", "lab_staff", "auditor"]) {
      const user = await createUserWithRole(role, `phase8-deny-${role}`);
      const cookie = await login(user.email);
      await request(app)
        .post(`/outputs/${outputId}/approve`)
        .set("Cookie", cookie)
        .send({ note: "Attempted approval." })
        .expect(403);
    }

    const output = await prisma.generatedOutput.findUniqueOrThrow({ where: { id: outputId } });
    expect(output.status).toBe("review_required");
  });

  it("retains rejected outputs and excludes them from approved-output use", async () => {
    const user = await createUserWithRole("clinician", "phase8-reject");
    const cookie = await login(user.email);
    const [outputId] = await seedGeneratedOutputs(cookie);

    await request(app)
      .post(`/outputs/${outputId}/reject`)
      .set("Cookie", cookie)
      .send({ note: "Incorrect synthesis." })
      .expect(200);

    const rejected = await prisma.generatedOutput.findUniqueOrThrow({ where: { id: outputId } });
    expect(rejected.status).toBe("rejected");
    expect(await prisma.generatedOutput.count({ where: { status: { in: ["approved", "edited"] } } })).toBe(0);
  });

  it("filters audit logs and protects admin health and user patch routes", async () => {
    const admin = await createUserWithRole("hospital_admin", "phase8-admin");
    const adminCookie = await login(admin.email);
    const auditor = await createUserWithRole("auditor", "phase8-auditor");
    const auditorCookie = await login(auditor.email);
    const clinician = await createUserWithRole("clinician", "phase8-admin-target");

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "generated_output.approve",
        targetType: "generated_output",
        targetId: "target-1",
        outcome: "success",
        requestId: "req-phase8"
      }
    });

    const audit = await request(app)
      .get("/audit-logs?action=generated_output.approve&traceId=req-phase8")
      .set("Cookie", auditorCookie)
      .expect(200);
    expect(audit.body.data.auditLogs).toHaveLength(1);

    await request(app).get("/admin/system-health").set("Cookie", adminCookie).expect(200);
    await request(app)
      .patch(`/admin/users/${clinician.id}`)
      .set("Cookie", adminCookie)
      .send({ fullName: "Updated Clinician", status: "active", roleKeys: ["clinician"] })
      .expect(200);
    await request(app).get("/admin/system-health").set("Cookie", auditorCookie).expect(403);
  });
});

async function seedGeneratedOutputs(cookie: string[]) {
  const scoped = await createScopedEncounter(cookie);
  const ambient = await request(app)
    .post(`/encounters/${scoped.encounterId}/ambient-sessions`)
    .set("Cookie", cookie)
    .send({})
    .expect(201);
  const ambientSessionId = ambient.body.data.ambientSession.id as string;

  const created = await prisma.generatedOutput.createManyAndReturn({
    data: ["Summary", "Note", "Referral", "Risk"].map((title) => ({
      ambientSessionId,
      outputType: "summary",
      title,
      content: { title, text: `${title} content` },
      status: "review_required",
      sourceReferences: [],
      uncertaintyReasons: []
    }))
  });
  return created.map((output) => output.id);
}
