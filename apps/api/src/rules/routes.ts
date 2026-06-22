import { ruleResultPatchSchema } from "@matria/shared";
import type { Prisma } from "@prisma/client";
import { Router } from "express";
import { writeAudit } from "../audit.js";
import { requirePermission } from "../auth/middleware.js";
import { getEncounterOrThrow } from "../clinical/scope.js";
import { prisma } from "../db/prisma.js";
import { AppError, notFound } from "../http/errors.js";
import { requiredParam } from "../http/params.js";
import { sendOk } from "../http/responses.js";
import { evaluateRules } from "./rule-runner.js";

export const rulesRouter = Router();

rulesRouter.post(
  "/encounters/:encounterId/preflight",
  requirePermission("rule:evaluate"),
  async (req, res, next) => {
    try {
      const encounterId = requiredParam(req, "encounterId");
      const encounter = await prisma.encounter.findUnique({
        where: { id: encounterId },
        include: {
          pregnancyEpisode: true,
          observations: { orderBy: { createdAt: "desc" } },
          sessionNote: true,
          ambientSessions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { transcriptClinicalCandidates: { orderBy: { createdAt: "desc" } } }
          }
        }
      });
      if (!encounter) throw notFound("Encounter");
      if (encounter.pregnancyEpisode.patientId !== encounter.patientId) {
        throw new AppError("SCOPE_MISMATCH", "Encounter scope is inconsistent.", 409);
      }

      const candidates =
        encounter.ambientSessions[0]?.transcriptClinicalCandidates.map((candidate) => ({
          id: candidate.id,
          text: candidate.text
        })) ?? [];
      const results = evaluateRules({
        pregnancyEpisode: encounter.pregnancyEpisode,
        observations: encounter.observations,
        sessionNote: encounter.sessionNote,
        transcriptCandidateTexts: candidates
      });

      const persisted = await prisma.$transaction(async (tx) => {
        await tx.ruleResult.updateMany({
          where: { encounterId: encounter.id, status: "active" },
          data: { status: "superseded" }
        });
        const run = await tx.ruleEvaluationRun.create({
          data: {
            encounterId: encounter.id,
            triggeredById: req.currentUser!.id,
            completedAt: new Date(),
            metadata: {
              observationCount: encounter.observations.length,
              transcriptCandidateCount: candidates.length
            }
          }
        });
        for (const result of results) {
          await tx.ruleResult.create({
            data: {
              evaluationRunId: run.id,
              encounterId: encounter.id,
              ruleId: result.ruleId,
              ruleVersion: result.ruleVersion,
              severity: result.severity,
              blockingLevel: result.blockingLevel,
              actionType: result.actionType,
              evidence: result.evidence as Prisma.InputJsonValue,
              sourceReferences: result.sourceReferences as Prisma.InputJsonValue,
              confidence: result.confidence,
              suggestedAction: result.suggestedAction,
              thresholdDescription: result.thresholdDescription,
              needsLocalGuidelineValidation: result.needsLocalGuidelineValidation
            }
          });
        }
        return tx.ruleResult.findMany({
          where: { evaluationRunId: run.id },
          orderBy: { createdAt: "asc" }
        });
      });

      await writeAudit({
        actorId: req.currentUser!.id,
        action: "rule.preflight_run",
        targetType: "encounter",
        targetId: encounter.id,
        outcome: "success",
        requestId: req.requestId,
        metadata: { resultCount: persisted.length }
      });
      return sendOk(req, res, { ruleResults: persisted });
    } catch (error) {
      return next(error);
    }
  }
);

rulesRouter.get(
  "/encounters/:encounterId/rule-results",
  requirePermission("encounter:read"),
  async (req, res, next) => {
    try {
      const encounter = await getEncounterOrThrow(requiredParam(req, "encounterId"));
      const ruleResults = await prisma.ruleResult.findMany({
        where: { encounterId: encounter.id, status: { not: "superseded" } },
        orderBy: { createdAt: "desc" }
      });
      return sendOk(req, res, { ruleResults });
    } catch (error) {
      return next(error);
    }
  }
);

rulesRouter.patch(
  "/rule-results/:ruleResultId",
  requirePermission("rule:acknowledge"),
  async (req, res, next) => {
    try {
      const input = ruleResultPatchSchema.parse(req.body);
      const ruleResultId = requiredParam(req, "ruleResultId");
      const existing = await prisma.ruleResult.findUnique({ where: { id: ruleResultId } });
      if (!existing) throw notFound("Rule result");
      const ruleResult = await prisma.ruleResult.update({
        where: { id: existing.id },
        data: {
          status: input.status,
          acknowledgementNote: input.acknowledgementNote,
          acknowledgedAt: new Date(),
          acknowledgedById: req.currentUser!.id
        }
      });
      await writeAudit({
        actorId: req.currentUser!.id,
        action: "rule.acknowledge",
        targetType: "rule_result",
        targetId: ruleResult.id,
        outcome: "success",
        requestId: req.requestId,
        metadata: { status: input.status }
      });
      return sendOk(req, res, { ruleResult });
    } catch (error) {
      return next(error);
    }
  }
);
