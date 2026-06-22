import {
  clinicalFileCreateSchema,
  consentCreateSchema,
  encounterCreateSchema,
  encounterTransitionSchema,
  observationCreateSchema,
  patientCreateSchema,
  pregnancyEpisodeCreateSchema,
  sessionNoteUpdateSchema
} from "@matria/shared";
import type { Prisma } from "@prisma/client";
import { Router } from "express";
import { writeAudit } from "../audit.js";
import { requirePermission } from "../auth/middleware.js";
import { prisma } from "../db/prisma.js";
import { AppError, notFound } from "../http/errors.js";
import { requiredParam } from "../http/params.js";
import { sendOk } from "../http/responses.js";
import { assertAllowedClinicalFile } from "../evidence/file-validation.js";
import {
  assertEncounterTransition,
  assertPregnancyBelongsToPatient,
  getEncounterOrThrow,
  requireConsent
} from "./scope.js";

export const clinicalRouter = Router();

clinicalRouter.get("/patients", requirePermission("patient:read"), async (req, res, next) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const patients = await prisma.patient.findMany({
      where: search
        ? {
            OR: [
              { fullName: { contains: search, mode: "insensitive" } },
              { hospitalNumber: { contains: search, mode: "insensitive" } }
            ]
          }
        : undefined,
      orderBy: { updatedAt: "desc" },
      take: 50
    });
    return sendOk(req, res, { patients });
  } catch (error) {
    return next(error);
  }
});

clinicalRouter.post("/patients", requirePermission("patient:write"), async (req, res, next) => {
  try {
    const input = patientCreateSchema.parse(req.body);
    const patient = await prisma.patient.create({
      data: {
        ...input,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
        createdById: req.currentUser!.id
      }
    });
    await writeAudit({
      actorId: req.currentUser!.id,
      action: "patient.create",
      targetType: "patient",
      targetId: patient.id,
      outcome: "success",
      requestId: req.requestId
    });
    return sendOk(req, res, { patient }, 201);
  } catch (error) {
    return next(error);
  }
});

clinicalRouter.get(
  "/patients/:patientId",
  requirePermission("patient:read"),
  async (req, res, next) => {
    try {
      const patientId = requiredParam(req, "patientId");
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: { pregnancyEpisodes: { orderBy: { createdAt: "desc" } } }
      });
      if (!patient) throw notFound("Patient");
      return sendOk(req, res, { patient });
    } catch (error) {
      return next(error);
    }
  }
);

clinicalRouter.post(
  "/patients/:patientId/pregnancy-episodes",
  requirePermission("pregnancy_episode:write"),
  async (req, res, next) => {
    try {
      const patientId = requiredParam(req, "patientId");
      const patient = await prisma.patient.findUnique({ where: { id: patientId } });
      if (!patient) throw notFound("Patient");
      const input = pregnancyEpisodeCreateSchema.parse(req.body);
      const pregnancyEpisode = await prisma.pregnancyEpisode.create({
        data: {
          patientId: patient.id,
          label: input.label,
          estimatedDueDate: input.estimatedDueDate ? new Date(input.estimatedDueDate) : undefined,
          gestationalAgeWeeks: input.gestationalAgeWeeks,
          status: input.status
        }
      });
      await writeAudit({
        actorId: req.currentUser!.id,
        action: "pregnancy_episode.create",
        targetType: "pregnancy_episode",
        targetId: pregnancyEpisode.id,
        outcome: "success",
        requestId: req.requestId,
        metadata: { patientId: patient.id }
      });
      return sendOk(req, res, { pregnancyEpisode }, 201);
    } catch (error) {
      return next(error);
    }
  }
);

clinicalRouter.get(
  "/patients/:patientId/pregnancy-episodes",
  requirePermission("patient:read"),
  async (req, res, next) => {
    try {
      const patientId = requiredParam(req, "patientId");
      const pregnancyEpisodes = await prisma.pregnancyEpisode.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" }
      });
      return sendOk(req, res, { pregnancyEpisodes });
    } catch (error) {
      return next(error);
    }
  }
);

clinicalRouter.get(
  "/patients/:patientId/encounters",
  requirePermission("encounter:read"),
  async (req, res, next) => {
    try {
      const patientId = requiredParam(req, "patientId");
      const patient = await prisma.patient.findUnique({ where: { id: patientId } });
      if (!patient) throw notFound("Patient");
      const encounters = await prisma.encounter.findMany({
        where: { patientId },
        include: {
          pregnancyEpisode: true,
          createdBy: { select: { id: true, fullName: true, email: true } }
        },
        orderBy: { createdAt: "desc" },
        take: 50
      });
      return sendOk(req, res, { encounters });
    } catch (error) {
      return next(error);
    }
  }
);

clinicalRouter.post("/encounters", requirePermission("encounter:write"), async (req, res, next) => {
  try {
    const input = encounterCreateSchema.parse(req.body);
    await assertPregnancyBelongsToPatient(input.patientId, input.pregnancyEpisodeId);
    const encounter = await prisma.encounter.create({
      data: {
        patientId: input.patientId,
        pregnancyEpisodeId: input.pregnancyEpisodeId,
        visitType: input.visitType,
        facilityName: input.facilityName,
        createdById: req.currentUser!.id,
        sessionNote: {
          create: {
            content: "",
            updatedById: req.currentUser!.id
          }
        }
      },
      include: { patient: true, pregnancyEpisode: true, sessionNote: true }
    });
    await writeAudit({
      actorId: req.currentUser!.id,
      action: "encounter.create",
      targetType: "encounter",
      targetId: encounter.id,
      outcome: "success",
      requestId: req.requestId,
      metadata: { patientId: input.patientId, pregnancyEpisodeId: input.pregnancyEpisodeId }
    });
    return sendOk(req, res, { encounter }, 201);
  } catch (error) {
    return next(error);
  }
});

clinicalRouter.get(
  "/encounters/:encounterId",
  requirePermission("encounter:read"),
  async (req, res, next) => {
    try {
      const encounterId = requiredParam(req, "encounterId");
      const encounter = await prisma.encounter.findUnique({
        where: { id: encounterId },
        include: {
          patient: true,
          pregnancyEpisode: true,
          consentRecords: { orderBy: { createdAt: "desc" } },
          clinicalFiles: { orderBy: { createdAt: "desc" } },
          observations: { orderBy: { createdAt: "desc" } },
          sessionNote: true
        }
      });
      if (!encounter) throw notFound("Encounter");
      if (encounter.pregnancyEpisode.patientId !== encounter.patientId) {
        throw new AppError("SCOPE_MISMATCH", "Encounter scope is inconsistent.", 409);
      }
      return sendOk(req, res, { encounter });
    } catch (error) {
      return next(error);
    }
  }
);

clinicalRouter.get(
  "/encounters/:encounterId/workspace-state",
  requirePermission("encounter:read"),
  async (req, res, next) => {
    try {
      const encounterId = requiredParam(req, "encounterId");
      const encounter = await prisma.encounter.findUnique({
        where: { id: encounterId },
        include: {
          patient: true,
          pregnancyEpisode: true,
          consentRecords: { orderBy: { createdAt: "desc" } },
          clinicalFiles: { orderBy: { createdAt: "desc" } },
          observations: { orderBy: { createdAt: "desc" } },
          sessionNote: true,
          ruleResults: {
            where: { status: { not: "superseded" } },
            orderBy: { createdAt: "desc" }
          },
          ambientSessions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              transcriptTurns: { orderBy: [{ startTimeMs: "asc" }, { createdAt: "asc" }] },
              summaryRevisions: { orderBy: { createdAt: "desc" }, take: 10 },
              highlightCards: { where: { status: "active" }, orderBy: { createdAt: "desc" } },
              suggestions: {
                where: { status: { not: "superseded" } },
                include: { results: { orderBy: { createdAt: "desc" } } },
                orderBy: { updatedAt: "desc" }
              },
              evidenceHandoffs: { orderBy: { createdAt: "desc" }, take: 20 },
              evidenceFindings: { orderBy: { createdAt: "desc" }, take: 30 },
              generatedOutputs: {
                include: { approvals: { orderBy: { createdAt: "desc" }, take: 3 } },
                orderBy: { updatedAt: "desc" },
                take: 50
              },
              artifactRevisions: { orderBy: { createdAt: "desc" }, take: 30 }
            }
          }
        }
      });
      if (!encounter) throw notFound("Encounter");
      if (encounter.pregnancyEpisode.patientId !== encounter.patientId) {
        throw new AppError("SCOPE_MISMATCH", "Encounter scope is inconsistent.", 409);
      }
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          OR: [
            { targetId: encounter.id },
            { metadata: { path: ["encounterId"], equals: encounter.id } }
          ]
        },
        orderBy: { createdAt: "desc" },
        take: 20
      });
      return sendOk(req, res, {
        encounter,
        consentRecords: encounter.consentRecords,
        clinicalFiles: encounter.clinicalFiles,
        observations: encounter.observations,
        sessionNote: encounter.sessionNote,
        ruleResults: encounter.ruleResults,
        ambientSession: encounter.ambientSessions[0] ?? null,
        recentActivity: auditLogs
      });
    } catch (error) {
      return next(error);
    }
  }
);

clinicalRouter.patch(
  "/encounters/:encounterId/status",
  requirePermission("encounter:write"),
  async (req, res, next) => {
    try {
      const input = encounterTransitionSchema.parse(req.body);
      const encounter = await getEncounterOrThrow(requiredParam(req, "encounterId"));
      assertEncounterTransition(encounter.status, input.status);
      const updated = await prisma.encounter.update({
        where: { id: encounter.id },
        data: { status: input.status }
      });
      await writeAudit({
        actorId: req.currentUser!.id,
        action: "encounter.status_update",
        targetType: "encounter",
        targetId: encounter.id,
        outcome: "success",
        requestId: req.requestId,
        metadata: { from: encounter.status, to: input.status }
      });
      return sendOk(req, res, { encounter: updated });
    } catch (error) {
      return next(error);
    }
  }
);

clinicalRouter.post(
  "/encounters/:encounterId/consents",
  requirePermission("consent:write"),
  async (req, res, next) => {
    try {
      const encounter = await getEncounterOrThrow(requiredParam(req, "encounterId"));
      const input = consentCreateSchema.parse(req.body);
      const consentRecord = await prisma.consentRecord.create({
        data: {
          encounterId: encounter.id,
          mode: input.mode,
          status: input.status,
          note: input.note,
          actorId: req.currentUser!.id
        }
      });
      await writeAudit({
        actorId: req.currentUser!.id,
        action: "consent.record",
        targetType: "encounter",
        targetId: encounter.id,
        outcome: "success",
        requestId: req.requestId,
        metadata: { mode: input.mode, status: input.status }
      });
      return sendOk(req, res, { consentRecord }, 201);
    } catch (error) {
      return next(error);
    }
  }
);

clinicalRouter.get(
  "/encounters/:encounterId/consents",
  requirePermission("encounter:read"),
  async (req, res, next) => {
    try {
      const encounter = await getEncounterOrThrow(requiredParam(req, "encounterId"));
      const consentRecords = await prisma.consentRecord.findMany({
        where: { encounterId: encounter.id },
        orderBy: { createdAt: "desc" }
      });
      return sendOk(req, res, { consentRecords });
    } catch (error) {
      return next(error);
    }
  }
);

clinicalRouter.post(
  "/encounters/:encounterId/files",
  requirePermission("clinical_file:write"),
  async (req, res, next) => {
    try {
      const encounter = await getEncounterOrThrow(requiredParam(req, "encounterId"));
      const input = clinicalFileCreateSchema.parse(req.body);
      if (input.kind === "audio") await requireConsent(encounter.id, "audio");
      if (input.kind === "image" || input.kind === "document" || input.kind === "ultrasound") {
        await requireConsent(encounter.id, "media");
      }
      assertAllowedClinicalFile({
        kind: input.kind,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes
      });
      const clinicalFile = await prisma.clinicalFile.create({
        data: {
          encounterId: encounter.id,
          kind: input.kind,
          fileName: input.fileName,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
          storageUri: input.storageUri,
          checksumSha256: input.checksumSha256,
          metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
          createdById: req.currentUser!.id
        }
      });
      await writeAudit({
        actorId: req.currentUser!.id,
        action: "clinical_file.metadata_create",
        targetType: "encounter",
        targetId: encounter.id,
        outcome: "success",
        requestId: req.requestId,
        metadata: { kind: input.kind }
      });
      return sendOk(req, res, { clinicalFile }, 201);
    } catch (error) {
      return next(error);
    }
  }
);

clinicalRouter.post(
  "/encounters/:encounterId/observations",
  requirePermission("observation:write"),
  async (req, res, next) => {
    try {
      const encounter = await getEncounterOrThrow(requiredParam(req, "encounterId"));
      const input = observationCreateSchema.parse(req.body);
      const observation = await prisma.structuredObservation.create({
        data: {
          encounterId: encounter.id,
          type: input.type,
          value: input.value as Prisma.InputJsonValue,
          verificationStatus: input.verificationStatus,
          source: input.source,
          createdById: req.currentUser!.id
        }
      });
      await writeAudit({
        actorId: req.currentUser!.id,
        action: "observation.create",
        targetType: "encounter",
        targetId: encounter.id,
        outcome: "success",
        requestId: req.requestId,
        metadata: { type: input.type }
      });
      return sendOk(req, res, { observation }, 201);
    } catch (error) {
      return next(error);
    }
  }
);

clinicalRouter.get(
  "/encounters/:encounterId/observations",
  requirePermission("encounter:read"),
  async (req, res, next) => {
    try {
      const encounter = await getEncounterOrThrow(requiredParam(req, "encounterId"));
      const observations = await prisma.structuredObservation.findMany({
        where: { encounterId: encounter.id },
        orderBy: { createdAt: "desc" }
      });
      return sendOk(req, res, { observations });
    } catch (error) {
      return next(error);
    }
  }
);

clinicalRouter.get(
  "/encounters/:encounterId/session-note",
  requirePermission("encounter:read"),
  async (req, res, next) => {
    try {
      const encounter = await getEncounterOrThrow(requiredParam(req, "encounterId"));
      const sessionNote = await prisma.sessionNote.upsert({
        where: { encounterId: encounter.id },
        create: { encounterId: encounter.id, content: "", updatedById: req.currentUser!.id },
        update: {}
      });
      return sendOk(req, res, { sessionNote });
    } catch (error) {
      return next(error);
    }
  }
);

clinicalRouter.put(
  "/encounters/:encounterId/session-note",
  requirePermission("session_note:write"),
  async (req, res, next) => {
    try {
      const encounter = await getEncounterOrThrow(requiredParam(req, "encounterId"));
      const input = sessionNoteUpdateSchema.parse(req.body);
      const sessionNote = await prisma.sessionNote.upsert({
        where: { encounterId: encounter.id },
        create: {
          encounterId: encounter.id,
          content: input.content,
          updatedById: req.currentUser!.id
        },
        update: {
          content: input.content,
          updatedById: req.currentUser!.id,
          version: { increment: 1 }
        }
      });
      await writeAudit({
        actorId: req.currentUser!.id,
        action: "session_note.update",
        targetType: "encounter",
        targetId: encounter.id,
        outcome: "success",
        requestId: req.requestId,
        metadata: { version: sessionNote.version }
      });
      return sendOk(req, res, { sessionNote });
    } catch (error) {
      return next(error);
    }
  }
);

clinicalRouter.post(
  "/encounters/:encounterId/check-consent/:mode",
  requirePermission("encounter:write"),
  async (req, res, next) => {
    try {
      const encounter = await getEncounterOrThrow(requiredParam(req, "encounterId"));
      await requireConsent(encounter.id, requiredParam(req, "mode"));
      return sendOk(req, res, { allowed: true });
    } catch (error) {
      return next(error);
    }
  }
);
