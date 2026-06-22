import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildAndPersistContextSnapshot } from "../ai/context-builder.js";
import { runSynthesisTick } from "../ai/orchestrator.js";
import { envSchema } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import {
  app,
  createScopedEncounter,
  createUserWithRole,
  login,
  resetDatabase
} from "./test-utils.js";

describe("Phase 6 Gemini orchestration", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("validates Gemini provider config for mock and Vertex AI modes", () => {
    expect(envSchema.parse({ GEMINI_PROVIDER: "mock" }).GEMINI_PROVIDER).toBe("mock");
    expect(() => envSchema.parse({ GEMINI_PROVIDER: "vertex_ai" })).toThrow(/GOOGLE_CLOUD_PROJECT/);
    const parsed = envSchema.parse({
      GEMINI_PROVIDER: "vertex_ai",
      GOOGLE_CLOUD_PROJECT: "matria-prod",
      GOOGLE_CLOUD_LOCATION: "global"
    });
    expect(parsed.GOOGLE_CLOUD_LOCATION).toBe("global");
  });

  it("builds scoped context snapshots with note edits, transcript corrections, suggestions, and memory", async () => {
    const user = await createUserWithRole("clinician", "ai-context");
    const cookie = await login(user.email);
    const scoped = await createScopedEncounter(cookie);
    await grantConsent(cookie, scoped.encounterId, "ai");

    const ambient = await request(app)
      .post(`/encounters/${scoped.encounterId}/ambient-sessions`)
      .set("Cookie", cookie)
      .send({})
      .expect(201);
    const ambientSessionId = ambient.body.data.ambientSession.id as string;

    await request(app)
      .post(`/encounters/${scoped.encounterId}/observations`)
      .set("Cookie", cookie)
      .send({
        type: "vitals",
        value: { bloodPressure: "120/80" },
        verificationStatus: "clinician_entered",
        source: "manual_entry"
      })
      .expect(201);
    await request(app)
      .put(`/encounters/${scoped.encounterId}/session-note`)
      .set("Cookie", cookie)
      .send({ content: "Clinician note: patient reports no bleeding." })
      .expect(200);

    const turn = await prisma.transcriptTurn.create({
      data: {
        ambientSessionId,
        speakerLabel: "Speaker 1",
        speakerRoleGuess: "patient",
        roleConfidence: 0.9,
        startTimeMs: 0,
        endTimeMs: 1000,
        text: "Patient reports no bleeding.",
        correctionStatus: "clinician_corrected",
        correctedById: user.id
      }
    });
    await prisma.transcriptClinicalCandidate.create({
      data: {
        ambientSessionId,
        transcriptTurnId: turn.id,
        candidateType: "danger_sign_mention",
        text: "no bleeding",
        sourceReferences: [{ type: "TranscriptTurn", id: turn.id }],
        confidence: 0.6
      }
    });
    const suggestion = await prisma.suggestion.create({
      data: {
        ambientSessionId,
        title: "Confirm bleeding status",
        rationale: "Bleeding was mentioned in transcript context.",
        priority: "medium",
        sourceReferences: [`TranscriptTurn:${turn.id}`],
        resultOptions: [{ value: "confirmed", label: "Confirmed" }],
        freeTextAllowed: true,
        clinicianActionRequired: true
      }
    });
    await prisma.suggestionResult.create({
      data: {
        suggestionId: suggestion.id,
        selectedOptionValue: "confirmed",
        selectedOptionLabel: "Confirmed",
        freeTextNote: "Reviewed.",
        actorId: user.id
      }
    });
    await prisma.patientMemoryFact.create({
      data: {
        patientId: scoped.patientId,
        pregnancyEpisodeId: scoped.pregnancyEpisodeId,
        content: "Prior ANC visit noted normal BP.",
        dedupeKey: "prior-anc-normal-bp",
        sourceType: "test_seed",
        provenance: { approvedBy: user.id },
        createdById: user.id
      }
    });
    const other = await createScopedEncounter(cookie);
    await prisma.patientMemoryFact.create({
      data: {
        patientId: other.patientId,
        pregnancyEpisodeId: other.pregnancyEpisodeId,
        content: "This memory must not leak.",
        dedupeKey: "other-memory-must-not-leak",
        sourceType: "test_seed",
        provenance: { approvedBy: user.id },
        createdById: user.id
      }
    });

    const snapshot = await buildAndPersistContextSnapshot(ambientSessionId, user.id);
    const payload = snapshot.payload as {
      sessionNote: { content: string; version: number };
      transcriptTurns: Array<{ id: string; correctionStatus: string }>;
      transcriptCandidates: Array<{ id: string }>;
      suggestions: Array<{ id: string; results: unknown[] }>;
      patientMemory: Array<{ content: string }>;
    };
    expect(payload.sessionNote.content).toContain("patient reports no bleeding");
    expect(payload.transcriptTurns[0]?.correctionStatus).toBe("clinician_corrected");
    expect(payload.transcriptCandidates.length).toBe(1);
    expect(payload.suggestions[0]?.results.length).toBe(1);
    expect(payload.patientMemory.map((memory) => memory.content)).toEqual([
      "Prior ANC visit noted normal BP."
    ]);
  });

  it("requires AI consent and ai:synthesis permission for synthesis ticks", async () => {
    const clinician = await createUserWithRole("clinician", "ai-consent");
    const clinicianCookie = await login(clinician.email);
    const scoped = await createScopedEncounter(clinicianCookie);
    const ambient = await request(app)
      .post(`/encounters/${scoped.encounterId}/ambient-sessions`)
      .set("Cookie", clinicianCookie)
      .send({})
      .expect(201);
    const ambientSessionId = ambient.body.data.ambientSession.id as string;

    const missingConsent = await request(app)
      .post(`/ambient-sessions/${ambientSessionId}/synthesis-ticks`)
      .set("Cookie", clinicianCookie)
      .send({ triggerReason: "test" })
      .expect(409);
    expect(missingConsent.body.error.code).toBe("CONSENT_REQUIRED");

    await grantConsent(clinicianCookie, scoped.encounterId, "ai");
    const nurse = await createUserWithRole("nurse_midwife", "ai-deny");
    const nurseCookie = await login(nurse.email);
    await request(app)
      .post(`/ambient-sessions/${ambientSessionId}/synthesis-ticks`)
      .set("Cookie", nurseCookie)
      .send({ triggerReason: "test" })
      .expect(403);
  });

  it("runs mock synthesis, persists draft artifacts, and records suggestion results", async () => {
    const user = await createUserWithRole("clinician", "ai-run");
    const cookie = await login(user.email);
    const scoped = await createScopedEncounter(cookie);
    await grantConsent(cookie, scoped.encounterId, "ai");
    await request(app)
      .post(`/encounters/${scoped.encounterId}/observations`)
      .set("Cookie", cookie)
      .send({
        type: "vitals",
        value: { bloodPressure: "168/112" },
        verificationStatus: "clinician_entered",
        source: "manual_entry"
      })
      .expect(201);
    const ambient = await request(app)
      .post(`/encounters/${scoped.encounterId}/ambient-sessions`)
      .set("Cookie", cookie)
      .send({})
      .expect(201);
    const ambientSessionId = ambient.body.data.ambientSession.id as string;

    const synthesis = await request(app)
      .post(`/ambient-sessions/${ambientSessionId}/synthesis-ticks`)
      .set("Cookie", cookie)
      .send({ triggerReason: "test" })
      .expect(201);
    expect(synthesis.body.data.synthesisTick.status).toBe("completed");
    expect(synthesis.body.data.artifacts.length).toBeGreaterThan(0);

    const summaries = await request(app)
      .get(`/ambient-sessions/${ambientSessionId}/artifacts`)
      .set("Cookie", cookie)
      .expect(200);
    expect(summaries.body.data.summaries[0].content).toContain("Structured observations");

    const suggestions = await request(app)
      .get(`/ambient-sessions/${ambientSessionId}/suggestions`)
      .set("Cookie", cookie)
      .expect(200);
    const suggestionId = suggestions.body.data.suggestions[0].id;
    await request(app)
      .patch(`/suggestions/${suggestionId}`)
      .set("Cookie", cookie)
      .send({ status: "done" })
      .expect(200);
    await request(app)
      .post(`/suggestions/${suggestionId}/results`)
      .set("Cookie", cookie)
      .send({
        selectedOptionValue: "reviewed",
        selectedOptionLabel: "Reviewed",
        freeTextNote: "Discussed during visit."
      })
      .expect(201);

    const audit = await prisma.auditLog.findFirst({
      where: { action: "ai.synthesis_tick.complete" }
    });
    expect(audit?.outcome).toBe("success");
  });

  it("marks patches stale when clinician context changes after snapshot creation", async () => {
    const user = await createUserWithRole("clinician", "ai-stale");
    const cookie = await login(user.email);
    const scoped = await createScopedEncounter(cookie);
    await grantConsent(cookie, scoped.encounterId, "ai");
    await request(app)
      .post(`/encounters/${scoped.encounterId}/observations`)
      .set("Cookie", cookie)
      .send({
        type: "vitals",
        value: { bloodPressure: "120/78" },
        verificationStatus: "clinician_entered",
        source: "manual_entry"
      })
      .expect(201);
    const ambient = await request(app)
      .post(`/encounters/${scoped.encounterId}/ambient-sessions`)
      .set("Cookie", cookie)
      .send({})
      .expect(201);
    const ambientSessionId = ambient.body.data.ambientSession.id as string;

    const result = await runSynthesisTick({
      ambientSessionId,
      actorId: user.id,
      requestId: "test-stale",
      triggerReason: "unit_test",
      options: {
        beforeApply: async () => {
          await prisma.sessionNote.update({
            where: { encounterId: scoped.encounterId },
            data: {
              content: "Changed after snapshot.",
              updatedById: user.id,
              version: { increment: 1 }
            }
          });
        }
      }
    });
    expect(result.synthesisTick.status).toBe("stale");
    const staleArtifact = await prisma.aiArtifactRevision.findFirstOrThrow({
      where: { ambientSessionId }
    });
    expect(staleArtifact.validationStatus).toBe("stale");
    const projectedSummary = await prisma.summaryRevision.findFirst({
      where: { ambientSessionId }
    });
    expect(projectedSummary).toBeNull();
  });
});

async function grantConsent(cookie: string[], encounterId: string, mode: string) {
  await request(app)
    .post(`/encounters/${encounterId}/consents`)
    .set("Cookie", cookie)
    .send({ mode, status: "granted" })
    .expect(201);
}
