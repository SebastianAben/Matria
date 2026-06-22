import request from "supertest";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildAndPersistContextSnapshot } from "../ai/context-builder.js";
import { envSchema } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { runFfmpeg } from "../evidence/ffmpeg.js";
import {
  app,
  createScopedEncounter,
  createUserWithRole,
  login,
  resetDatabase
} from "./test-utils.js";

let tinyPng: Buffer;
let tinyMp4: Buffer;

describe("Phase 7 medical evidence", () => {
  beforeAll(async () => {
    tinyPng = await sharp({
      create: {
        width: 2,
        height: 2,
        channels: 3,
        background: { r: 240, g: 248, b: 246 }
      }
    })
      .png()
      .toBuffer();
    tinyMp4 = await createTinyMp4();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("validates evidence provider defaults and provider-specific config", () => {
    expect(envSchema.parse({ NODE_ENV: "test" }).MEDICAL_EVIDENCE_PROVIDER).toBe("mock");
    expect(
      envSchema.parse({
        NODE_ENV: "development",
        MEDICAL_EVIDENCE_PROVIDER: "gemini_flash",
        GOOGLE_CLOUD_PROJECT: "matria-dev"
      }).MEDICAL_EVIDENCE_MODEL
    ).toBe("gemini-3.5-flash");
    expect(
      envSchema.parse({
        NODE_ENV: "development",
        MEDICAL_EVIDENCE_PROVIDER: "ollama_medgemma"
      }).OLLAMA_MEDGEMMA_MODEL
    ).toBe("medgemma1.5:4b");
  });

  it("uploads clinical media, samples an image, runs mock evidence, and keeps findings review-only", async () => {
    const user = await createUserWithRole("clinician", "evidence");
    const cookie = await login(user.email);
    const scoped = await createScopedEncounter(cookie);

    await grantConsent(cookie, scoped.encounterId, "media");
    await grantConsent(cookie, scoped.encounterId, "ai");

    const ambientResponse = await request(app)
      .post(`/encounters/${scoped.encounterId}/ambient-sessions`)
      .set("Cookie", cookie)
      .send({})
      .expect(201);
    const ambientSessionId = ambientResponse.body.data.ambientSession.id as string;

    const uploadResponse = await request(app)
      .post(`/encounters/${scoped.encounterId}/files/upload`)
      .set("Cookie", cookie)
      .field("kind", "ultrasound")
      .field("sourceLabel", "bedside ultrasound")
      .attach("file", tinyPng, { filename: "scan.png", contentType: "image/png" })
      .expect(201);
    const clinicalFileId = uploadResponse.body.data.clinicalFile.id as string;
    expect(uploadResponse.body.data.clinicalFile.checksumSha256).toHaveLength(64);

    await request(app)
      .get(`/clinical-files/${clinicalFileId}/download`)
      .set("Cookie", cookie)
      .expect("Content-Type", /image\/png/)
      .expect(200);

    const sampleResponse = await request(app)
      .post(`/clinical-files/${clinicalFileId}/frame-samples`)
      .set("Cookie", cookie)
      .send({ ambientSessionId })
      .expect(201);
    const frameSampleId = sampleResponse.body.data.frameSamples[0].id as string;
    expect(sampleResponse.body.data.frameSamples[0].processingStatus).toBe("sampled");

    const handoffResponse = await request(app)
      .post(`/ambient-sessions/${ambientSessionId}/evidence-handoffs`)
      .set("Cookie", cookie)
      .send({
        taskType: "visible_finding_description",
        exactQuestion: "Describe visible evidence and limitations for clinician review.",
        clinicalFileIds: [clinicalFileId],
        frameSampleIds: [frameSampleId],
        expectedOutputSchema: { clinicianReviewRequired: true }
      })
      .expect(201);
    const handoffId = handoffResponse.body.data.handoff.id as string;

    const runResponse = await request(app)
      .post(`/evidence-handoffs/${handoffId}/run`)
      .set("Cookie", cookie)
      .send({})
      .expect(200);
    expect(runResponse.body.data.handoff.status).toBe("succeeded");
    expect(runResponse.body.data.finding.clinicianReviewRequired).toBe(true);

    const observations = await prisma.structuredObservation.findMany({
      where: { encounterId: scoped.encounterId }
    });
    const memoryFacts = await prisma.patientMemoryFact.findMany({
      where: { patientId: scoped.patientId }
    });
    expect(observations).toHaveLength(0);
    expect(memoryFacts).toHaveLength(0);

    const evidenceResponse = await request(app)
      .get(`/ambient-sessions/${ambientSessionId}/evidence`)
      .set("Cookie", cookie)
      .expect(200);
    expect(evidenceResponse.body.data.findings).toHaveLength(1);
  });

  it("includes frame samples and evidence findings in later context snapshots", async () => {
    const user = await createUserWithRole("clinician", "context-evidence");
    const cookie = await login(user.email);
    const scoped = await createScopedEncounter(cookie);
    await grantConsent(cookie, scoped.encounterId, "media");
    await grantConsent(cookie, scoped.encounterId, "ai");

    const ambientResponse = await request(app)
      .post(`/encounters/${scoped.encounterId}/ambient-sessions`)
      .set("Cookie", cookie)
      .send({})
      .expect(201);
    const ambientSessionId = ambientResponse.body.data.ambientSession.id as string;
    const uploadResponse = await request(app)
      .post(`/encounters/${scoped.encounterId}/files/upload`)
      .set("Cookie", cookie)
      .field("kind", "image")
      .attach("file", tinyPng, { filename: "lab.png", contentType: "image/png" })
      .expect(201);
    const clinicalFileId = uploadResponse.body.data.clinicalFile.id as string;
    const sampleResponse = await request(app)
      .post(`/clinical-files/${clinicalFileId}/frame-samples`)
      .set("Cookie", cookie)
      .send({ ambientSessionId })
      .expect(201);
    const frameSampleId = sampleResponse.body.data.frameSamples[0].id as string;
    const handoffResponse = await request(app)
      .post(`/ambient-sessions/${ambientSessionId}/evidence-handoffs`)
      .set("Cookie", cookie)
      .send({
        taskType: "document_extraction",
        exactQuestion: "Extract visible values for clinician verification.",
        clinicalFileIds: [clinicalFileId],
        frameSampleIds: [frameSampleId]
      })
      .expect(201);
    await request(app)
      .post(`/evidence-handoffs/${handoffResponse.body.data.handoff.id}/run`)
      .set("Cookie", cookie)
      .send({})
      .expect(200);

    const latestSnapshot = await buildAndPersistContextSnapshot(ambientSessionId, user.id);
    const payload = latestSnapshot.payload as {
      mediaFrameSamples?: unknown[];
      medicalEvidenceFindings?: Array<{ clinicianReviewRequired: boolean }>;
    };
    expect(payload.mediaFrameSamples?.length).toBeGreaterThan(0);
    expect(payload.medicalEvidenceFindings?.[0]?.clinicianReviewRequired).toBe(true);
  });

  it("samples frames from an uploaded video file with bundled FFmpeg", async () => {
    const user = await createUserWithRole("clinician", "video-evidence");
    const cookie = await login(user.email);
    const scoped = await createScopedEncounter(cookie);
    await grantConsent(cookie, scoped.encounterId, "media");

    const uploadResponse = await request(app)
      .post(`/encounters/${scoped.encounterId}/files/upload`)
      .set("Cookie", cookie)
      .field("kind", "ultrasound")
      .attach("file", tinyMp4, {
        filename: "scan.mp4",
        contentType: "video/mp4"
      })
      .expect(201);

    const sampleResponse = await request(app)
      .post(`/clinical-files/${uploadResponse.body.data.clinicalFile.id}/frame-samples`)
      .set("Cookie", cookie)
      .send({ intervalSeconds: 5 })
      .expect(201);
    const firstSample = sampleResponse.body.data.frameSamples[0];
    expect(firstSample.processingStatus).toBe("sampled");
    expect(firstSample.mimeType).toBe("image/jpeg");
    expect(firstSample.storageKey).toBeTruthy();
    expect(firstSample.checksumSha256).toHaveLength(64);
    expect(firstSample.sourceTimestampMs).toBe(0);
    expect(firstSample.failureReason).toBeNull();
  });

  it("records degraded frame samples when an uploaded video file cannot be decoded", async () => {
    const user = await createUserWithRole("clinician", "bad-video-evidence");
    const cookie = await login(user.email);
    const scoped = await createScopedEncounter(cookie);
    await grantConsent(cookie, scoped.encounterId, "media");

    const uploadResponse = await request(app)
      .post(`/encounters/${scoped.encounterId}/files/upload`)
      .set("Cookie", cookie)
      .field("kind", "ultrasound")
      .attach("file", Buffer.from("not-real-video"), {
        filename: "scan.mp4",
        contentType: "video/mp4"
      })
      .expect(201);

    const sampleResponse = await request(app)
      .post(`/clinical-files/${uploadResponse.body.data.clinicalFile.id}/frame-samples`)
      .set("Cookie", cookie)
      .send({ intervalSeconds: 5 })
      .expect(201);
    const firstSample = sampleResponse.body.data.frameSamples[0];
    expect(firstSample.processingStatus).toBe("degraded");
    expect(firstSample.failureReason).toContain("Video frame extraction failed");
  });
});

async function grantConsent(cookie: string[], encounterId: string, mode: "media" | "ai") {
  await request(app)
    .post(`/encounters/${encounterId}/consents`)
    .set("Cookie", cookie)
    .send({ mode, status: "granted" })
    .expect(201);
}

async function createTinyMp4() {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "matria-test-video-"));
  const outputPath = path.join(tempRoot, "tiny.mp4");
  try {
    await runFfmpeg([
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      "testsrc=size=32x32:rate=1:duration=12",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "faststart",
      outputPath
    ]);
    return await readFile(outputPath);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}
