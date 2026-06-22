import {
  suggestionPatchSchema,
  suggestionResultSchema,
  synthesisTickCreateSchema
} from "@matria/shared";
import type { Prisma } from "@prisma/client";
import { Router } from "express";
import { writeAudit } from "../audit.js";
import { requirePermission } from "../auth/middleware.js";
import { prisma } from "../db/prisma.js";
import { notFound } from "../http/errors.js";
import { requiredParam } from "../http/params.js";
import { sendOk } from "../http/responses.js";
import { runSynthesisTick } from "./orchestrator.js";

export const aiRouter = Router();

aiRouter.post(
  "/ambient-sessions/:sessionId/synthesis-ticks",
  requirePermission("ai:synthesis"),
  async (req, res, next) => {
    try {
      const input = synthesisTickCreateSchema.parse(req.body);
      const result = await runSynthesisTick({
        ambientSessionId: requiredParam(req, "sessionId"),
        actorId: req.currentUser!.id,
        requestId: req.requestId,
        triggerReason: input.triggerReason,
        clientRequestId: input.clientRequestId
      });
      return sendOk(req, res, result, 201);
    } catch (error) {
      return next(error);
    }
  }
);

aiRouter.get(
  "/ambient-sessions/:sessionId/artifacts",
  requirePermission("encounter:read"),
  async (req, res, next) => {
    try {
      const sessionId = requiredParam(req, "sessionId");
      const artifacts = await prisma.aiArtifactRevision.findMany({
        where: { ambientSessionId: sessionId },
        orderBy: { createdAt: "desc" },
        take: 50
      });
      const summaries = await prisma.summaryRevision.findMany({
        where: { ambientSessionId: sessionId },
        orderBy: { createdAt: "desc" },
        take: 10
      });
      return sendOk(req, res, { artifacts, summaries });
    } catch (error) {
      return next(error);
    }
  }
);

aiRouter.get(
  "/ambient-sessions/:sessionId/highlights",
  requirePermission("encounter:read"),
  async (req, res, next) => {
    try {
      const highlightCards = await prisma.highlightCard.findMany({
        where: { ambientSessionId: requiredParam(req, "sessionId"), status: "active" },
        orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
        take: 50
      });
      return sendOk(req, res, { highlightCards });
    } catch (error) {
      return next(error);
    }
  }
);

aiRouter.get(
  "/ambient-sessions/:sessionId/suggestions",
  requirePermission("encounter:read"),
  async (req, res, next) => {
    try {
      const suggestions = await prisma.suggestion.findMany({
        where: { ambientSessionId: requiredParam(req, "sessionId"), status: { not: "superseded" } },
        include: { results: { orderBy: { createdAt: "desc" } } },
        orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
        take: 50
      });
      return sendOk(req, res, { suggestions });
    } catch (error) {
      return next(error);
    }
  }
);

aiRouter.patch(
  "/suggestions/:suggestionId",
  requirePermission("suggestion:resolve"),
  async (req, res, next) => {
    try {
      const input = suggestionPatchSchema.parse(req.body);
      const existing = await prisma.suggestion.findUnique({
        where: { id: requiredParam(req, "suggestionId") }
      });
      if (!existing) throw notFound("Suggestion");
      const suggestion = await prisma.suggestion.update({
        where: { id: existing.id },
        data: { status: input.status }
      });
      await writeAudit({
        actorId: req.currentUser!.id,
        action: "suggestion.update",
        targetType: "suggestion",
        targetId: suggestion.id,
        outcome: "success",
        requestId: req.requestId,
        metadata: { status: input.status, ambientSessionId: suggestion.ambientSessionId }
      });
      return sendOk(req, res, { suggestion });
    } catch (error) {
      return next(error);
    }
  }
);

aiRouter.post(
  "/suggestions/:suggestionId/results",
  requirePermission("suggestion:resolve"),
  async (req, res, next) => {
    try {
      const input = suggestionResultSchema.parse(req.body);
      const suggestion = await prisma.suggestion.findUnique({
        where: { id: requiredParam(req, "suggestionId") }
      });
      if (!suggestion) throw notFound("Suggestion");
      const suggestionResult = await prisma.suggestionResult.create({
        data: {
          suggestionId: suggestion.id,
          selectedOptionValue: input.selectedOptionValue,
          selectedOptionLabel: input.selectedOptionLabel,
          freeTextNote: input.freeTextNote,
          contextImpact: input.contextImpact as Prisma.InputJsonValue | undefined,
          actorId: req.currentUser!.id
        }
      });
      await writeAudit({
        actorId: req.currentUser!.id,
        action: "suggestion.result_create",
        targetType: "suggestion",
        targetId: suggestion.id,
        outcome: "success",
        requestId: req.requestId,
        metadata: {
          ambientSessionId: suggestion.ambientSessionId,
          selectedOptionValue: input.selectedOptionValue
        }
      });
      return sendOk(req, res, { suggestionResult }, 201);
    } catch (error) {
      return next(error);
    }
  }
);

aiRouter.get(
  "/ambient-sessions/:sessionId/context-snapshots",
  requirePermission("encounter:read"),
  async (req, res, next) => {
    try {
      const contextSnapshots = await prisma.contextSnapshot.findMany({
        where: { ambientSessionId: requiredParam(req, "sessionId") },
        orderBy: { createdAt: "desc" },
        take: 20
      });
      return sendOk(req, res, { contextSnapshots });
    } catch (error) {
      return next(error);
    }
  }
);
