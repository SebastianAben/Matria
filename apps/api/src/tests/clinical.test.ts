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

describe("ANC encounter workflow", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates patient, pregnancy episode, encounter, observation, and session note", async () => {
    const user = await createUserWithRole("clinician", "clinician");
    const cookie = await login(user.email);
    const scoped = await createScopedEncounter(cookie);

    await request(app)
      .post(`/encounters/${scoped.encounterId}/consents`)
      .set("Cookie", cookie)
      .send({ mode: "media", status: "granted" })
      .expect(201);

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

    const noteResponse = await request(app)
      .put(`/encounters/${scoped.encounterId}/session-note`)
      .set("Cookie", cookie)
      .send({ content: "Patient reports mild nausea. No bleeding reported." })
      .expect(200);

    expect(noteResponse.body.data.sessionNote.version).toBe(2);

    const encounterResponse = await request(app)
      .get(`/encounters/${scoped.encounterId}`)
      .set("Cookie", cookie)
      .expect(200);
    expect(encounterResponse.body.data.encounter.observations).toHaveLength(1);
    expect(encounterResponse.body.data.encounter.consentRecords).toHaveLength(1);
  });

  it("rejects cross-patient pregnancy episode scope", async () => {
    const user = await createUserWithRole("clinician", "scope");
    const cookie = await login(user.email);
    const first = await createScopedEncounter(cookie);
    const second = await createScopedEncounter(cookie);

    const response = await request(app)
      .post("/encounters")
      .set("Cookie", cookie)
      .send({
        patientId: first.patientId,
        pregnancyEpisodeId: second.pregnancyEpisodeId,
        visitType: "routine_anc"
      })
      .expect(409);

    expect(response.body.error.code).toBe("SCOPE_MISMATCH");
  });

  it("blocks media metadata before media consent", async () => {
    const user = await createUserWithRole("clinician", "consent");
    const cookie = await login(user.email);
    const scoped = await createScopedEncounter(cookie);

    const response = await request(app)
      .post(`/encounters/${scoped.encounterId}/files`)
      .set("Cookie", cookie)
      .send({
        kind: "ultrasound",
        fileName: "scan.mp4",
        mimeType: "video/mp4",
        sizeBytes: 1024
      })
      .expect(409);

    expect(response.body.error.code).toBe("CONSENT_REQUIRED");
  });

  it("rejects invalid encounter lifecycle transitions", async () => {
    const user = await createUserWithRole("clinician", "transition");
    const cookie = await login(user.email);
    const scoped = await createScopedEncounter(cookie);

    const response = await request(app)
      .patch(`/encounters/${scoped.encounterId}/status`)
      .set("Cookie", cookie)
      .send({ status: "approved" })
      .expect(409);

    expect(response.body.error.code).toBe("INVALID_STATE_TRANSITION");
  });
});
