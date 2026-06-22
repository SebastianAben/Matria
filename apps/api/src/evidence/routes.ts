import {
  clinicalFileUploadFieldsSchema,
  evidenceHandoffCreateSchema,
  type ClinicalFileKind
} from "@matria/shared";
import type { Prisma } from "@prisma/client";
import { Router } from "express";
import multer from "multer";
import { writeAudit } from "../audit.js";
import { requirePermission } from "../auth/middleware.js";
import { buildAndPersistContextSnapshot } from "../ai/context-builder.js";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { AppError, notFound } from "../http/errors.js";
import { requiredParam } from "../http/params.js";
import { sendOk } from "../http/responses.js";
import { syncGeneratedOutputForEvidenceFinding } from "../outputs/routes.js";
import { getEncounterOrThrow, requireConsent } from "../clinical/scope.js";
import { assertAllowedClinicalFile } from "./file-validation.js";
import { sampleClinicalFileFrames } from "./frame-sampler.js";
import { createMedicalEvidenceProvider } from "./provider.js";
import { readClinicalFile, storeClinicalFile } from "./storage.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.CLINICAL_FILE_MAX_BYTES, files: 1 }
});

export const evidenceRouter = Router();

evidenceRouter.post(
  "/encounters/:encounterId/files/upload",
  requirePermission("clinical_file:write"),
  upload.single("file"),
  async (req, res, next) => {
    try {
      const encounter = await getEncounterOrThrow(requiredParam(req, "encounterId"));
      const fields = clinicalFileUploadFieldsSchema.parse(req.body);
      const file = req.file;
      if (!file) throw new AppError("VALIDATION_FAILED", "A multipart file is required.", 400);

      await requireFileConsent(encounter.id, fields.kind);
      assertAllowedClinicalFile({
        kind: fields.kind,
        mimeType: file.mimetype,
        sizeBytes: file.size
      });

      const stored = await storeClinicalFile({
        encounterId: encounter.id,
        fileName: file.originalname,
        buffer: file.buffer
      });
      const clinicalFile = await prisma.clinicalFile.create({
        data: {
          encounterId: encounter.id,
          kind: fields.kind,
          fileName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          storageProvider: stored.storageProvider,
          storageKey: stored.storageKey,
          storageUri: stored.storageUri,
          checksumSha256: stored.checksumSha256,
          metadata: { sourceLabel: fields.sourceLabel ?? null } as Prisma.InputJsonValue,
          createdById: req.currentUser!.id
        }
      });
      await writeAudit({
        actorId: req.currentUser!.id,
        action: "clinical_file.upload",
        targetType: "clinical_file",
        targetId: clinicalFile.id,
        outcome: "success",
        requestId: req.requestId,
        metadata: {
          encounterId: encounter.id,
          kind: clinicalFile.kind,
          mimeType: clinicalFile.mimeType,
          sizeBytes: clinicalFile.sizeBytes,
          checksumSha256: clinicalFile.checksumSha256
        }
      });
      return sendOk(req, res, { clinicalFile }, 201);
    } catch (error) {
      return next(error);
    }
  }
);

evidenceRouter.get(
  "/encounters/:encounterId/files",
  requirePermission("encounter:read"),
  async (req, res, next) => {
    try {
      const encounter = await getEncounterOrThrow(requiredParam(req, "encounterId"));
      const clinicalFiles = await prisma.clinicalFile.findMany({
        where: { encounterId: encounter.id },
        orderBy: { createdAt: "desc" },
        include: { frameSamples: { orderBy: { createdAt: "desc" }, take: 5 } }
      });
      return sendOk(req, res, { clinicalFiles });
    } catch (error) {
      return next(error);
    }
  }
);

evidenceRouter.get(
  "/clinical-files/:fileId/download",
  requirePermission("encounter:read"),
  async (req, res, next) => {
    try {
      const clinicalFile = await prisma.clinicalFile.findUnique({
        where: { id: requiredParam(req, "fileId") }
      });
      if (!clinicalFile) throw notFound("Clinical file");
      if (!clinicalFile.storageKey) {
        throw new AppError("VALIDATION_FAILED", "Clinical file has no stored bytes.", 400);
      }
      res.setHeader("Content-Type", clinicalFile.mimeType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${safeDownloadName(clinicalFile.fileName)}"`
      );
      return res.send(await readClinicalFile(clinicalFile.storageKey));
    } catch (error) {
      return next(error);
    }
  }
);

evidenceRouter.post(
  "/clinical-files/:fileId/frame-samples",
  requirePermission("ai:synthesis"),
  async (req, res, next) => {
    try {
      const clinicalFile = await prisma.clinicalFile.findUnique({
        where: { id: requiredParam(req, "fileId") }
      });
      if (!clinicalFile) throw notFound("Clinical file");
      await requireConsent(clinicalFile.encounterId, "media");
      const frameSamples = await sampleClinicalFileFrames(clinicalFile.id, req.body);
      await writeAudit({
        actorId: req.currentUser!.id,
        action: "medical_evidence.frame_samples",
        targetType: "clinical_file",
        targetId: clinicalFile.id,
        outcome: "success",
        requestId: req.requestId,
        metadata: {
          encounterId: clinicalFile.encounterId,
          sampleCount: frameSamples.length,
          statuses: frameSamples.map((sample) => sample.processingStatus)
        }
      });
      return sendOk(req, res, { frameSamples }, 201);
    } catch (error) {
      return next(error);
    }
  }
);

evidenceRouter.post(
  "/ambient-sessions/:sessionId/evidence-handoffs",
  requirePermission("ai:synthesis"),
  async (req, res, next) => {
    try {
      const input = evidenceHandoffCreateSchema.parse(req.body);
      const ambientSession = await prisma.ambientSessionState.findUnique({
        where: { id: requiredParam(req, "sessionId") },
        include: { encounter: true }
      });
      if (!ambientSession) throw notFound("Ambient session");
      await requireConsent(ambientSession.encounterId, "media");
      const contextSnapshot = await buildAndPersistContextSnapshot(
        ambientSession.id,
        req.currentUser!.id
      );
      await assertEvidenceScope({
        encounterId: ambientSession.encounterId,
        clinicalFileIds: input.clinicalFileIds,
        frameSampleIds: input.frameSampleIds
      });
      const provider = createMedicalEvidenceProvider();
      const handoff = await prisma.medicalEvidenceHandoff.create({
        data: {
          ambientSessionId: ambientSession.id,
          contextSnapshotId: contextSnapshot.id,
          requestingArtifactId: input.requestingArtifactId,
          taskType: input.taskType,
          exactQuestion: input.exactQuestion,
          clinicalContext: contextSnapshot.payload as Prisma.InputJsonValue,
          expectedOutputSchema: (input.expectedOutputSchema ?? {}) as Prisma.InputJsonValue,
          safetyInstructions: safetyInstructions(),
          provider: provider.name,
          model: provider.model,
          requestedById: req.currentUser!.id,
          clinicalFiles: {
            create: input.clinicalFileIds.map((clinicalFileId) => ({ clinicalFileId }))
          },
          frameSamples: {
            create: input.frameSampleIds.map((frameSampleId) => ({ frameSampleId }))
          }
        },
        include: { clinicalFiles: true, frameSamples: true }
      });
      await writeAudit({
        actorId: req.currentUser!.id,
        action: "medical_evidence.handoff_create",
        targetType: "medical_evidence_handoff",
        targetId: handoff.id,
        outcome: "success",
        requestId: req.requestId,
        metadata: {
          ambientSessionId: ambientSession.id,
          provider: handoff.provider,
          model: handoff.model,
          taskType: handoff.taskType
        }
      });
      return sendOk(req, res, { handoff }, 201);
    } catch (error) {
      return next(error);
    }
  }
);

evidenceRouter.post(
  "/evidence-handoffs/:handoffId/run",
  requirePermission("ai:synthesis"),
  async (req, res, next) => {
    try {
      const result = await runEvidenceHandoff(requiredParam(req, "handoffId"), {
        actorId: req.currentUser!.id,
        requestId: req.requestId
      });
      return sendOk(req, res, result);
    } catch (error) {
      return next(error);
    }
  }
);

evidenceRouter.get(
  "/ambient-sessions/:sessionId/evidence",
  requirePermission("encounter:read"),
  async (req, res, next) => {
    try {
      const ambientSessionId = requiredParam(req, "sessionId");
      const [handoffs, findings, frameSamples] = await Promise.all([
        prisma.medicalEvidenceHandoff.findMany({
          where: { ambientSessionId },
          orderBy: { createdAt: "desc" },
          take: 30,
          include: { clinicalFiles: true, frameSamples: true }
        }),
        prisma.medicalEvidenceFinding.findMany({
          where: { ambientSessionId },
          orderBy: { createdAt: "desc" },
          take: 50
        }),
        prisma.medicalEvidenceFrameSample.findMany({
          where: { ambientSessionId },
          orderBy: { createdAt: "desc" },
          take: 50
        })
      ]);
      return sendOk(req, res, { handoffs, findings, frameSamples });
    } catch (error) {
      return next(error);
    }
  }
);

async function runEvidenceHandoff(
  handoffId: string,
  input: { actorId: string; requestId: string }
) {
  const handoff = await prisma.medicalEvidenceHandoff.findUnique({
    where: { id: handoffId },
    include: {
      ambientSession: { include: { encounter: true } },
      clinicalFiles: { include: { clinicalFile: true } },
      frameSamples: { include: { frameSample: true } }
    }
  });
  if (!handoff) throw notFound("Medical evidence handoff");
  await requireConsent(handoff.ambientSession.encounterId, "media");

  const provider = createMedicalEvidenceProvider();
  const toolCall = await prisma.aiToolCall.create({
    data: {
      ambientSessionId: handoff.ambientSessionId,
      contextSnapshotId: handoff.contextSnapshotId,
      provider: provider.name,
      model: provider.model,
      toolName: "medical_evidence.analyze",
      status: "pending",
      requestMetadata: {
        handoffId: handoff.id,
        taskType: handoff.taskType,
        clinicalFileCount: handoff.clinicalFiles.length,
        frameSampleCount: handoff.frameSamples.length
      }
    }
  });

  await prisma.medicalEvidenceHandoff.update({
    where: { id: handoff.id },
    data: { status: "running", provider: provider.name, model: provider.model }
  });

  try {
    const attachments = await evidenceAttachments(handoff);
    const startedAt = Date.now();
    const providerResult = await provider.analyze({
      handoffId: handoff.id,
      taskType: handoff.taskType,
      exactQuestion: handoff.exactQuestion,
      clinicalContext: handoff.clinicalContext,
      safetyInstructions: handoff.safetyInstructions,
      attachments
    });
    const finding = await prisma.medicalEvidenceFinding.create({
      data: {
        ambientSessionId: handoff.ambientSessionId,
        handoffId: handoff.id,
        clinicalFileId: handoff.clinicalFiles[0]?.clinicalFileId,
        frameSampleId: handoff.frameSamples[0]?.frameSampleId,
        provider: provider.name,
        model: provider.model,
        taskType: handoff.taskType,
        findings: providerResult.parsed.findings as Prisma.InputJsonValue,
        extractedValues: providerResult.parsed.extractedValues as Prisma.InputJsonValue,
        frameReferences: providerResult.parsed.frameReferences as Prisma.InputJsonValue,
        sourceEvidence: providerResult.parsed.sourceEvidence as Prisma.InputJsonValue,
        confidence: providerResult.parsed.confidence,
        uncertaintyReasons: providerResult.parsed.uncertaintyReasons as Prisma.InputJsonValue,
        qualityLimitations: providerResult.parsed.qualityLimitations as Prisma.InputJsonValue,
        clinicianReviewRequired: true
      }
    });
    const [, updatedHandoff] = await Promise.all([
      syncGeneratedOutputForEvidenceFinding(finding.id),
      prisma.medicalEvidenceHandoff.update({
        where: { id: handoff.id },
        data: { status: "succeeded", completedAt: new Date(), failureReason: null }
      }),
      prisma.aiToolCall.update({
        where: { id: toolCall.id },
        data: {
          status: "succeeded",
          responseMetadata: {
            ...providerResult.responseMetadata,
            rawTextLength: providerResult.text.length
          },
          latencyMs: Date.now() - startedAt,
          completedAt: new Date()
        }
      }),
      writeAudit({
        actorId: input.actorId,
        action: "medical_evidence.provider_result",
        targetType: "medical_evidence_handoff",
        targetId: handoff.id,
        outcome: "success",
        requestId: input.requestId,
        metadata: { provider: provider.name, model: provider.model, findingId: finding.id }
      })
    ]);
    return { handoff: updatedHandoff, finding };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Medical evidence provider failed.";
    const [updatedHandoff] = await Promise.all([
      prisma.medicalEvidenceHandoff.update({
        where: { id: handoff.id },
        data: { status: "failed", failureReason: message, completedAt: new Date() }
      }),
      prisma.aiToolCall.update({
        where: { id: toolCall.id },
        data: {
          status: "failed",
          errorMessage: message,
          completedAt: new Date()
        }
      }),
      writeAudit({
        actorId: input.actorId,
        action: "medical_evidence.provider_failure",
        targetType: "medical_evidence_handoff",
        targetId: handoff.id,
        outcome: "failure",
        requestId: input.requestId,
        metadata: { provider: provider.name, model: provider.model, message }
      })
    ]);
    return { handoff: updatedHandoff, finding: null };
  }
}

async function evidenceAttachments(
  handoff: NonNullable<Awaited<ReturnType<typeof prisma.medicalEvidenceHandoff.findUnique>>> & {
    clinicalFiles: Array<{
      clinicalFile: { id: string; fileName: string; mimeType: string; storageKey: string | null };
    }>;
    frameSamples: Array<{
      frameSample: { id: string; mimeType: string; storageKey: string | null };
    }>;
  }
) {
  const attachments = [];
  for (const link of handoff.frameSamples) {
    if (!link.frameSample.storageKey) continue;
    attachments.push({
      id: link.frameSample.id,
      label: `frame_sample:${link.frameSample.id}`,
      mimeType: link.frameSample.mimeType,
      bytes: await readClinicalFile(link.frameSample.storageKey)
    });
  }
  for (const link of handoff.clinicalFiles) {
    if (!link.clinicalFile.storageKey) continue;
    attachments.push({
      id: link.clinicalFile.id,
      label: `clinical_file:${link.clinicalFile.fileName}`,
      mimeType: link.clinicalFile.mimeType,
      bytes: await readClinicalFile(link.clinicalFile.storageKey)
    });
  }
  return attachments;
}

async function assertEvidenceScope(input: {
  encounterId: string;
  clinicalFileIds: string[];
  frameSampleIds: string[];
}) {
  const clinicalFiles = await prisma.clinicalFile.findMany({
    where: { id: { in: input.clinicalFileIds } }
  });
  if (clinicalFiles.length !== input.clinicalFileIds.length) throw notFound("Clinical file");
  if (clinicalFiles.some((file) => file.encounterId !== input.encounterId)) {
    throw new AppError("SCOPE_MISMATCH", "Clinical file does not belong to this encounter.", 409);
  }
  const frameSamples = await prisma.medicalEvidenceFrameSample.findMany({
    where: { id: { in: input.frameSampleIds } },
    include: { clinicalFile: true }
  });
  if (frameSamples.length !== input.frameSampleIds.length) throw notFound("Frame sample");
  if (frameSamples.some((sample) => sample.clinicalFile.encounterId !== input.encounterId)) {
    throw new AppError("SCOPE_MISMATCH", "Frame sample does not belong to this encounter.", 409);
  }
}

async function requireFileConsent(encounterId: string, kind: ClinicalFileKind) {
  if (kind === "audio") return requireConsent(encounterId, "audio");
  return requireConsent(encounterId, "media");
}

function safetyInstructions() {
  return [
    "Decision support only.",
    "Do not diagnose, prescribe, or make final triage decisions.",
    "Preserve uncertainty and quality limitations.",
    "Output is evidence for clinician review only and must not be treated as an approved fact."
  ].join(" ");
}

function safeDownloadName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}
