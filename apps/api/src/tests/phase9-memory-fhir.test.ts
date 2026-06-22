import request from "supertest";
import { Prisma } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../db/prisma.js";
import {
  app,
  createScopedEncounter,
  createUserWithRole,
  login,
  resetDatabase
} from "./test-utils.js";

describe("Phase 9 memory and FHIR export", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("writes curated memory only from approved or edited outputs and deduplicates repeats", async () => {
    const user = await createUserWithRole("clinician", "phase9-memory");
    const cookie = await login(user.email);
    const scoped = await createScopedEncounter(cookie);
    const outputIds = await seedOutputs(scoped.encounterId, cookie, [
      {
        title: "Approved summary",
        outputType: "summary",
        content: { memoryFacts: ["Prior ANC visit recorded stable blood pressure."] }
      },
      {
        title: "Edited summary",
        outputType: "summary",
        content: { text: "Draft value should not become canonical." }
      },
      {
        title: "Rejected summary",
        outputType: "summary",
        content: { memoryFacts: ["Rejected fact must not write."] }
      },
      {
        title: "Uncertain summary",
        outputType: "summary",
        content: { memoryFacts: ["Uncertain fact must not write."] }
      }
    ]);

    await request(app)
      .post(`/outputs/${outputIds[0]}/approve`)
      .set("Cookie", cookie)
      .send({ note: "Approved for memory." })
      .expect(200);
    await request(app)
      .post(`/outputs/${outputIds[1]}/edit`)
      .set("Cookie", cookie)
      .send({
        note: "Clinician corrected memory.",
        editedContent: { memoryCandidates: ["Clinician edited canonical content becomes memory."] }
      })
      .expect(200);
    await request(app)
      .post(`/outputs/${outputIds[2]}/reject`)
      .set("Cookie", cookie)
      .send({ note: "Unsupported." })
      .expect(200);
    await request(app)
      .post(`/outputs/${outputIds[3]}/mark-uncertain`)
      .set("Cookie", cookie)
      .send({ note: "Needs follow-up." })
      .expect(200);

    const firstWrite = await request(app)
      .post(`/encounters/${scoped.encounterId}/memory-writeback`)
      .set("Cookie", cookie)
      .send({ sourceOutputIds: outputIds })
      .expect(201);

    expect(firstWrite.body.data.createdMemoryFacts).toHaveLength(2);
    expect(firstWrite.body.data.rejectedSources).toHaveLength(2);
    expect(
      firstWrite.body.data.createdMemoryFacts.map((fact: { content: string }) => fact.content)
    ).toEqual(
      expect.arrayContaining([
        "Prior ANC visit recorded stable blood pressure.",
        "Clinician edited canonical content becomes memory."
      ])
    );

    const secondWrite = await request(app)
      .post(`/encounters/${scoped.encounterId}/memory-writeback`)
      .set("Cookie", cookie)
      .send({ sourceOutputIds: [outputIds[0], outputIds[1]] })
      .expect(201);
    expect(secondWrite.body.data.createdMemoryFacts).toHaveLength(0);
    expect(secondWrite.body.data.skippedDuplicates).toHaveLength(2);

    const listed = await request(app)
      .get(
        `/patients/${scoped.patientId}/pregnancy-episodes/${scoped.pregnancyEpisodeId}/memory-facts`
      )
      .set("Cookie", cookie)
      .expect(200);
    expect(listed.body.data.memoryFacts).toHaveLength(2);
    expect(
      await prisma.auditLog.count({
        where: { action: "memory.writeback", targetId: scoped.encounterId }
      })
    ).toBe(2);
  });

  it("generates a FHIR R4 document bundle from an approved referral summary", async () => {
    const user = await createUserWithRole("clinician", "phase9-fhir");
    const cookie = await login(user.email);
    const scoped = await createScopedEncounter(cookie);
    await grantConsent(cookie, scoped.encounterId, "fhir_export");
    await request(app)
      .post(`/encounters/${scoped.encounterId}/observations`)
      .set("Cookie", cookie)
      .send({
        type: "vitals",
        value: { bloodPressure: "118/76" },
        verificationStatus: "clinician_entered",
        source: "manual_entry"
      })
      .expect(201);
    const [referralOutputId] = await seedOutputs(scoped.encounterId, cookie, [
      {
        title: "Referral summary",
        outputType: "referral_summary",
        content: {
          referralSummary: "Referral-ready ANC summary reviewed by clinician.",
          memoryFacts: ["Referral reason reviewed."]
        }
      }
    ]);
    const approval = await request(app)
      .post(`/outputs/${referralOutputId}/approve`)
      .set("Cookie", cookie)
      .send({ note: "Referral approved." })
      .expect(200);

    const generated = await request(app)
      .post(`/encounters/${scoped.encounterId}/fhir-export`)
      .set("Cookie", cookie)
      .send({ exportKind: "referral", destinationLabel: "OB referral clinic" })
      .expect(201);

    const fhirExport = generated.body.data.fhirExport;
    const bundle = fhirExport.fhirBundle;
    expect(bundle.resourceType).toBe("Bundle");
    expect(bundle.type).toBe("document");
    expect(bundle.entry[0].resource.resourceType).toBe("Composition");
    expect(
      bundle.entry.map(
        (entry: { resource: { resourceType: string } }) => entry.resource.resourceType
      )
    ).toEqual(
      expect.arrayContaining([
        "Patient",
        "Encounter",
        "Practitioner",
        "Observation",
        "ServiceRequest",
        "Provenance"
      ])
    );
    const serviceRequest = bundle.entry.find(
      (entry: { resource: { resourceType: string } }) =>
        entry.resource.resourceType === "ServiceRequest"
    ).resource;
    expect(serviceRequest.status).toBe("draft");
    expect(serviceRequest.intent).toBe("proposal");
    expect(fhirExport.sourceManifest.clinicalApprovalIds).toContain(approval.body.data.approval.id);

    await request(app)
      .get(`/encounters/${scoped.encounterId}/fhir-exports`)
      .set("Cookie", cookie)
      .expect(200)
      .expect((response) => expect(response.body.data.fhirExports).toHaveLength(1));
    await request(app)
      .get(`/fhir-exports/${fhirExport.id}`)
      .set("Cookie", cookie)
      .expect(200)
      .expect((response) => expect(response.body.data.fhirExport.fhirBundle.type).toBe("document"));
    expect(await prisma.auditLog.count({ where: { action: "fhir_export.generate" } })).toBe(1);
  });

  it("blocks FHIR export without consent, gestational context, or critical acknowledgement", async () => {
    const user = await createUserWithRole("clinician", "phase9-block");
    const cookie = await login(user.email);
    const scoped = await createScopedEncounter(cookie);
    const [referralOutputId] = await seedOutputs(scoped.encounterId, cookie, [
      {
        title: "Referral summary",
        outputType: "referral_summary",
        content: { referralSummary: "Approved referral content." }
      }
    ]);
    await request(app)
      .post(`/outputs/${referralOutputId}/approve`)
      .set("Cookie", cookie)
      .send({ note: "Approved." })
      .expect(200);

    await request(app)
      .post(`/encounters/${scoped.encounterId}/fhir-export`)
      .set("Cookie", cookie)
      .send({ exportKind: "referral" })
      .expect(409)
      .expect((response) => expect(response.body.error.code).toBe("CONSENT_REQUIRED"));

    await grantConsent(cookie, scoped.encounterId, "fhir_export");
    await prisma.pregnancyEpisode.update({
      where: { id: scoped.pregnancyEpisodeId },
      data: { gestationalAgeWeeks: null, estimatedDueDate: null }
    });
    await request(app)
      .post(`/encounters/${scoped.encounterId}/fhir-export`)
      .set("Cookie", cookie)
      .send({ exportKind: "referral" })
      .expect(409)
      .expect((response) => expect(response.body.error.code).toBe("INVALID_STATE_TRANSITION"));

    await prisma.pregnancyEpisode.update({
      where: { id: scoped.pregnancyEpisodeId },
      data: { gestationalAgeWeeks: 24 }
    });
    await prisma.ruleResult.create({
      data: {
        encounterId: scoped.encounterId,
        ruleId: "critical-bp",
        ruleVersion: "test",
        severity: "critical",
        blockingLevel: "ack_required",
        actionType: "acknowledge",
        evidence: { systolic: 168 },
        sourceReferences: [],
        confidence: 1,
        suggestedAction: "Acknowledge before export."
      }
    });
    await request(app)
      .post(`/encounters/${scoped.encounterId}/fhir-export`)
      .set("Cookie", cookie)
      .send({ exportKind: "referral" })
      .expect(409)
      .expect((response) => expect(response.body.error.code).toBe("INVALID_STATE_TRANSITION"));
  });

  it("denies memory writeback and FHIR export to roles without approval/export permission", async () => {
    const clinician = await createUserWithRole("clinician", "phase9-deny-owner");
    const clinicianCookie = await login(clinician.email);
    const scoped = await createScopedEncounter(clinicianCookie);
    await grantConsent(clinicianCookie, scoped.encounterId, "fhir_export");
    const [referralOutputId] = await seedOutputs(scoped.encounterId, clinicianCookie, [
      {
        title: "Referral summary",
        outputType: "referral_summary",
        content: { referralSummary: "Approved referral content." }
      }
    ]);
    await request(app)
      .post(`/outputs/${referralOutputId}/approve`)
      .set("Cookie", clinicianCookie)
      .send({ note: "Approved." })
      .expect(200);

    for (const role of ["nurse_midwife", "lab_staff", "auditor", "hospital_admin"]) {
      const user = await createUserWithRole(role, `phase9-deny-${role}`);
      const cookie = await login(user.email);
      await request(app)
        .post(`/encounters/${scoped.encounterId}/memory-writeback`)
        .set("Cookie", cookie)
        .send({ sourceOutputIds: [referralOutputId] })
        .expect(403);
      await request(app)
        .post(`/encounters/${scoped.encounterId}/fhir-export`)
        .set("Cookie", cookie)
        .send({ exportKind: "referral", sourceOutputId: referralOutputId })
        .expect(403);
    }

    expect(await prisma.patientMemoryFact.count()).toBe(0);
    expect(await prisma.fhirExport.count()).toBe(0);
  });
});

async function seedOutputs(
  encounterId: string,
  cookie: string[],
  outputs: Array<{
    title: string;
    outputType: "summary" | "referral_summary" | "teleconsult_summary";
    content: Record<string, unknown>;
  }>
) {
  const ambient = await request(app)
    .post(`/encounters/${encounterId}/ambient-sessions`)
    .set("Cookie", cookie)
    .send({})
    .expect(201);
  const ambientSessionId = ambient.body.data.ambientSession.id as string;
  const created = await prisma.generatedOutput.createManyAndReturn({
    data: outputs.map((output) => ({
      ambientSessionId,
      outputType: output.outputType,
      title: output.title,
      content: output.content as Prisma.InputJsonValue,
      canonicalContent: output.content as Prisma.InputJsonValue,
      status: "review_required",
      sourceReferences: [],
      uncertaintyReasons: []
    }))
  });
  return created.map((output) => output.id);
}

async function grantConsent(cookie: string[], encounterId: string, mode: "fhir_export") {
  await request(app)
    .post(`/encounters/${encounterId}/consents`)
    .set("Cookie", cookie)
    .send({ mode, status: "granted" })
    .expect(201);
}
