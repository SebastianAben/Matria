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

describe("advisory rules and ambient transcript workflow", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("runs advisory preflight and acknowledges severe blood pressure without hard blocking", async () => {
    const user = await createUserWithRole("clinician", "rules");
    const cookie = await login(user.email);
    const scoped = await createScopedEncounter(cookie);

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

    const preflight = await request(app)
      .post(`/encounters/${scoped.encounterId}/preflight`)
      .set("Cookie", cookie)
      .expect(200);

    const severe = preflight.body.data.ruleResults.find(
      (result: { ruleId: string }) => result.ruleId === "severe-hypertension-vitals"
    );
    expect(severe.severity).toBe("critical");
    expect(severe.blockingLevel).toBe("ack_required");

    const acknowledged = await request(app)
      .patch(`/rule-results/${severe.id}`)
      .set("Cookie", cookie)
      .send({ status: "acknowledged", acknowledgementNote: "Reviewed with clinician." })
      .expect(200);
    expect(acknowledged.body.data.ruleResult.status).toBe("acknowledged");

    const audit = await prisma.auditLog.findFirst({ where: { action: "rule.acknowledge" } });
    expect(audit?.outcome).toBe("success");
  });

  it("creates consent-gated ambient sessions, mock transcript turns, and clinical candidates", async () => {
    const user = await createUserWithRole("clinician", "ambient");
    const cookie = await login(user.email);
    const scoped = await createScopedEncounter(cookie);

    const created = await request(app)
      .post(`/encounters/${scoped.encounterId}/ambient-sessions`)
      .set("Cookie", cookie)
      .send({})
      .expect(201);
    const sessionId = created.body.data.ambientSession.id;
    expect(created.body.data.ambientSession.status).toBe("consent_pending");

    const blockedStart = await request(app)
      .post(`/ambient-sessions/${sessionId}/start`)
      .set("Cookie", cookie)
      .expect(409);
    expect(blockedStart.body.error.code).toBe("CONSENT_REQUIRED");

    await request(app)
      .post(`/encounters/${scoped.encounterId}/consents`)
      .set("Cookie", cookie)
      .send({ mode: "audio", status: "granted" })
      .expect(201);
    await request(app)
      .post(`/encounters/${scoped.encounterId}/consents`)
      .set("Cookie", cookie)
      .send({ mode: "transcript", status: "granted" })
      .expect(201);

    await request(app)
      .post(`/ambient-sessions/${sessionId}/start`)
      .set("Cookie", cookie)
      .expect(200);

    const audio = await request(app)
      .post(`/ambient-sessions/${sessionId}/audio-events`)
      .set("Cookie", cookie)
      .send({
        sequence: 1,
        mimeType: "audio/wav",
        durationMs: 5000,
        transcriptText: "Clinician: Any bleeding today? Patient: I have bleeding and I am 24 weeks."
      })
      .expect(201);
    expect(audio.body.data.transcriptTurns.length).toBeGreaterThan(0);

    const turns = await request(app)
      .get(`/ambient-sessions/${sessionId}/transcript-turns`)
      .set("Cookie", cookie)
      .expect(200);
    expect(turns.body.data.transcriptTurns.length).toBeGreaterThan(0);

    const firstTurn = turns.body.data.transcriptTurns[0];
    const corrected = await request(app)
      .patch(`/transcript-turns/${firstTurn.id}`)
      .set("Cookie", cookie)
      .send({ speakerRoleGuess: "patient", text: "Patient reports bleeding and is 24 weeks." })
      .expect(200);
    expect(corrected.body.data.transcriptTurn.correctionStatus).toBe("clinician_corrected");

    const candidates = await prisma.transcriptClinicalCandidate.findMany({
      where: { ambientSessionId: sessionId }
    });
    expect(candidates.some((candidate) => candidate.candidateType === "danger_sign_mention")).toBe(
      true
    );
    expect(
      candidates.some((candidate) => candidate.candidateType === "gestational_age_mention")
    ).toBe(true);
  });
});
