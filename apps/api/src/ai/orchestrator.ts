import {
  evidenceHandoffCreateSchema,
  highlightCardSchema,
  suggestionSchema,
  type AiArtifactType
} from "@matria/shared";
import type { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { writeAudit } from "../audit.js";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { AppError, notFound } from "../http/errors.js";
import { syncGeneratedOutputForArtifact } from "../outputs/routes.js";
import { evaluateRules } from "../rules/rule-runner.js";
import { buildAndPersistContextSnapshot } from "./context-builder.js";
import { createGeminiProvider, type GeminiSynthesisResponse } from "./gemini-provider.js";
import { validateGeminiOutput } from "./output-validator.js";

export type SynthesisOptions = {
  beforeApply?: () => Promise<void>;
};

export async function runSynthesisTick(input: {
  ambientSessionId: string;
  actorId: string;
  requestId: string;
  triggerReason: string;
  clientRequestId?: string;
  options?: SynthesisOptions;
}) {
  const ambientSession = await prisma.ambientSessionState.findUnique({
    where: { id: input.ambientSessionId },
    include: { encounter: true }
  });
  if (!ambientSession) throw notFound("Ambient session");

  const activeTick = await prisma.synthesisTick.findFirst({
    where: {
      ambientSessionId: ambientSession.id,
      stateVersion: ambientSession.stateVersion,
      status: { in: ["pending", "running"] }
    },
    orderBy: { createdAt: "desc" }
  });
  if (activeTick) {
    await writeAudit({
      actorId: input.actorId,
      action: "ai.synthesis_tick.skipped",
      targetType: "ambient_session",
      targetId: ambientSession.id,
      outcome: "success",
      requestId: input.requestId,
      metadata: { activeTickId: activeTick.id, stateVersion: ambientSession.stateVersion }
    });
    return { synthesisTick: activeTick, contextSnapshot: null, artifacts: [] };
  }

  const synthesisTick = await prisma.synthesisTick.create({
    data: {
      ambientSessionId: ambientSession.id,
      requestedById: input.actorId,
      status: "running",
      triggerReason: input.triggerReason,
      clientRequestId: input.clientRequestId,
      stateVersion: ambientSession.stateVersion,
      startedAt: new Date()
    }
  });

  try {
    await runPreflightForSynthesis(ambientSession.encounterId, ambientSession.id, input.actorId);
    const contextSnapshot = await buildAndPersistContextSnapshot(ambientSession.id, input.actorId);
    await prisma.synthesisTick.update({
      where: { id: synthesisTick.id },
      data: { contextSnapshotId: contextSnapshot.id }
    });

    const provider = createGeminiProvider();
    const toolCall = await prisma.aiToolCall.create({
      data: {
        ambientSessionId: ambientSession.id,
        contextSnapshotId: contextSnapshot.id,
        provider: provider.name,
        model: provider.model,
        toolName: "gemini.synthesis",
        status: "pending",
        requestMetadata: {
          triggerReason: input.triggerReason,
          contextSnapshotId: contextSnapshot.id,
          provider: provider.name,
          googleCloudLocation: env.GOOGLE_CLOUD_LOCATION
        }
      }
    });

    await writeAudit({
      actorId: input.actorId,
      action: "ai.gemini_call.start",
      targetType: "context_snapshot",
      targetId: contextSnapshot.id,
      outcome: "success",
      requestId: input.requestId,
      metadata: { provider: provider.name, model: provider.model }
    });

    const startedAt = Date.now();
    let response: GeminiSynthesisResponse;
    try {
      const providerResult = await provider.synthesize({
        contextSnapshotId: contextSnapshot.id,
        context: contextSnapshot.payload
      });
      response = providerResult.parsed;
      validateGeminiOutput(contextSnapshot.payload as never, response);
      await prisma.aiToolCall.update({
        where: { id: toolCall.id },
        data: {
          status: "succeeded",
          responseMetadata: {
            ...providerResult.responseMetadata,
            patchCount: response.patches.length,
            rawTextLength: providerResult.text.length
          },
          latencyMs: Date.now() - startedAt,
          completedAt: new Date()
        }
      });
    } catch (error) {
      const validationFailure = error instanceof SyntaxError || error instanceof ZodError;
      const message = error instanceof Error ? error.message : "Gemini synthesis failed.";
      await prisma.aiToolCall.update({
        where: { id: toolCall.id },
        data: {
          status: validationFailure ? "validation_failed" : "failed",
          errorMessage: message,
          latencyMs: Date.now() - startedAt,
          completedAt: new Date()
        }
      });
      await prisma.synthesisTick.update({
        where: { id: synthesisTick.id },
        data: {
          status: validationFailure ? "validation_failed" : "failed",
          failureReason: message,
          completedAt: new Date()
        }
      });
      await writeAudit({
        actorId: input.actorId,
        action: validationFailure ? "ai.gemini_validation_failure" : "ai.gemini_call.failure",
        targetType: "context_snapshot",
        targetId: contextSnapshot.id,
        outcome: "failure",
        requestId: input.requestId,
        metadata: { message }
      });
      throw new AppError("INTERNAL_ERROR", message, validationFailure ? 422 : 502);
    }

    await input.options?.beforeApply?.();
    const stale = await isSnapshotStale(contextSnapshot.id);
    const artifacts = await persistGeminiArtifacts({
      ambientSessionId: ambientSession.id,
      contextSnapshotId: contextSnapshot.id,
      response,
      stale
    });
    const updatedTick = await prisma.synthesisTick.update({
      where: { id: synthesisTick.id },
      data: {
        status: stale ? "stale" : "completed",
        completedAt: new Date(),
        failureReason: stale ? "Session state changed after context snapshot creation." : null
      }
    });
    await writeAudit({
      actorId: input.actorId,
      action: stale ? "ai.synthesis_tick.stale" : "ai.synthesis_tick.complete",
      targetType: "ambient_session",
      targetId: ambientSession.id,
      outcome: "success",
      requestId: input.requestId,
      metadata: { contextSnapshotId: contextSnapshot.id, artifactCount: artifacts.length }
    });
    return { synthesisTick: updatedTick, contextSnapshot, artifacts };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Synthesis tick failed.";
    await prisma.synthesisTick.update({
      where: { id: synthesisTick.id },
      data: { status: "failed", failureReason: message, completedAt: new Date() }
    });
    await writeAudit({
      actorId: input.actorId,
      action: "ai.synthesis_tick.failure",
      targetType: "ambient_session",
      targetId: ambientSession.id,
      outcome: "failure",
      requestId: input.requestId,
      metadata: { message }
    });
    if (error instanceof AppError) throw error;
    throw error;
  }
}

async function runPreflightForSynthesis(
  encounterId: string,
  ambientSessionId: string,
  actorId: string
) {
  const encounter = await prisma.encounter.findUnique({
    where: { id: encounterId },
    include: {
      pregnancyEpisode: true,
      observations: { orderBy: { createdAt: "desc" } },
      sessionNote: true,
      ambientSessions: {
        where: { id: ambientSessionId },
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
  await prisma.$transaction(async (tx) => {
    await tx.ruleResult.updateMany({
      where: { encounterId: encounter.id, status: "active" },
      data: { status: "superseded" }
    });
    const run = await tx.ruleEvaluationRun.create({
      data: {
        encounterId: encounter.id,
        triggeredById: actorId,
        completedAt: new Date(),
        metadata: {
          source: "ai_synthesis",
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
          ambientSessionId,
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
  });
}

async function isSnapshotStale(contextSnapshotId: string) {
  const snapshot = await prisma.contextSnapshot.findUnique({ where: { id: contextSnapshotId } });
  if (!snapshot) throw notFound("Context snapshot");
  const current = await prisma.ambientSessionState.findUnique({
    where: { id: snapshot.ambientSessionId },
    include: { encounter: { include: { sessionNote: true } } }
  });
  if (!current) throw notFound("Ambient session");
  return (
    current.stateVersion !== snapshot.sessionStateVersion ||
    (current.encounter.sessionNote?.version ?? 0) !== snapshot.sessionNoteVersion
  );
}

async function persistGeminiArtifacts(input: {
  ambientSessionId: string;
  contextSnapshotId: string;
  response: GeminiSynthesisResponse;
  stale: boolean;
}) {
  return prisma.$transaction(async (tx) => {
    const created = [];
    for (const patch of input.response.patches) {
      const version =
        (await tx.aiArtifactRevision.count({
          where: { ambientSessionId: input.ambientSessionId, artifactType: patch.artifactType }
        })) + 1;
      const artifact = await tx.aiArtifactRevision.create({
        data: {
          ambientSessionId: input.ambientSessionId,
          contextSnapshotId: input.contextSnapshotId,
          artifactType: patch.artifactType,
          operation: patch.operation,
          artifactKey: patch.artifactId ?? patch.patchId,
          content: patch.content as Prisma.InputJsonValue,
          sourceReferences: patch.sourceReferences as Prisma.InputJsonValue,
          confidence: patch.confidence,
          uncertaintyReasons: patch.uncertaintyReasons as Prisma.InputJsonValue,
          ruleResultReferences: patch.ruleResultReferences as Prisma.InputJsonValue,
          memoryReferences: patch.memoryReferences as Prisma.InputJsonValue,
          medGemmaReferences: patch.medGemmaReferences as Prisma.InputJsonValue,
          clinicianActionRequired: patch.clinicianActionRequired,
          validationStatus: input.stale ? "stale" : "valid",
          reviewStatus: input.stale ? "stale" : "review_required",
          version
        }
      });
      created.push(artifact);
      await syncGeneratedOutputForArtifact(tx, {
        id: artifact.id,
        ambientSessionId: artifact.ambientSessionId,
        artifactType: artifact.artifactType,
        content: artifact.content,
        sourceReferences: artifact.sourceReferences,
        confidence: artifact.confidence,
        uncertaintyReasons: artifact.uncertaintyReasons,
        validationStatus: artifact.validationStatus,
        reviewStatus: artifact.reviewStatus
      });
      if (!input.stale) {
        await persistPatchProjection(
          tx,
          input.ambientSessionId,
          input.contextSnapshotId,
          artifact.id,
          patch
        );
      }
    }
    return created;
  });
}

async function persistPatchProjection(
  tx: Prisma.TransactionClient,
  ambientSessionId: string,
  contextSnapshotId: string,
  artifactRevisionId: string,
  patch: GeminiSynthesisResponse["patches"][number]
) {
  if (patch.operation === "no_change") return;
  if (patch.artifactType === "summary_update") {
    await tx.summaryRevision.create({
      data: {
        ambientSessionId,
        artifactRevisionId,
        content: String(patch.content.content ?? patch.content.summary ?? ""),
        sections: (patch.content.sections ?? {}) as Prisma.InputJsonValue,
        sourceReferences: patch.sourceReferences as Prisma.InputJsonValue,
        confidence: patch.confidence
      }
    });
  }
  if (patch.artifactType === "highlight_cards") {
    const cards = Array.isArray(patch.content.cards) ? patch.content.cards : [patch.content];
    for (const rawCard of cards) {
      const card = highlightCardSchema.parse(rawCard);
      await tx.highlightCard.create({
        data: {
          ambientSessionId,
          artifactRevisionId,
          type: card.type,
          severity: card.severity,
          title: card.title,
          body: card.body,
          sourceReferences: card.sourceReferences as Prisma.InputJsonValue,
          confidence: card.confidence,
          requiresAcknowledgement: card.requiresAcknowledgement
        }
      });
    }
  }
  if (patch.artifactType === "suggestions") {
    if (patch.operation === "replace") {
      await tx.suggestion.updateMany({
        where: { ambientSessionId, status: "open" },
        data: { status: "superseded" }
      });
    }
    const suggestions = Array.isArray(patch.content.suggestions)
      ? patch.content.suggestions
      : Array.isArray(patch.content.items)
        ? patch.content.items
        : [patch.content];
    for (const rawSuggestion of suggestions) {
      const suggestion = suggestionSchema.parse(rawSuggestion);
      await tx.suggestion.create({
        data: {
          ambientSessionId,
          artifactRevisionId,
          title: suggestion.title,
          rationale: suggestion.rationale,
          priority: suggestion.priority,
          status: suggestion.status,
          sourceReferences: suggestion.sourceReferences as Prisma.InputJsonValue,
          resultOptions: suggestion.resultOptions as Prisma.InputJsonValue,
          freeTextAllowed: suggestion.freeTextAllowed,
          clinicianActionRequired: suggestion.clinicianActionRequired
        }
      });
    }
  }
  if (patch.artifactType === "medgemma_handoff_request") {
    const parsed = evidenceHandoffCreateSchema.safeParse({
      taskType: patch.content.taskType ?? "other",
      exactQuestion: patch.content.exactQuestion ?? patch.content.question,
      clinicalFileIds: patch.content.clinicalFileIds ?? [],
      frameSampleIds: patch.content.frameSampleIds ?? [],
      expectedOutputSchema: patch.content.expectedOutputSchema ?? {}
    });
    if (!parsed.success) return;
    const [clinicalFiles, frameSamples] = await Promise.all([
      tx.clinicalFile.findMany({
        where: { id: { in: parsed.data.clinicalFileIds } },
        select: { id: true }
      }),
      tx.medicalEvidenceFrameSample.findMany({
        where: { id: { in: parsed.data.frameSampleIds } },
        select: { id: true }
      })
    ]);
    await tx.medicalEvidenceHandoff.create({
      data: {
        ambientSessionId,
        contextSnapshotId,
        requestingArtifactId: artifactRevisionId,
        taskType: parsed.data.taskType,
        exactQuestion: parsed.data.exactQuestion,
        clinicalContext: {
          source: "gemini_handoff_request",
          content: patch.content,
          sourceReferences: patch.sourceReferences
        } as Prisma.InputJsonValue,
        expectedOutputSchema: (parsed.data.expectedOutputSchema ?? {}) as Prisma.InputJsonValue,
        safetyInstructions:
          "Decision support only. Medical evidence output requires clinician review and must not be treated as an approved fact.",
        provider: env.MEDICAL_EVIDENCE_PROVIDER,
        model:
          env.MEDICAL_EVIDENCE_PROVIDER === "ollama_medgemma"
            ? env.OLLAMA_MEDGEMMA_MODEL
            : env.MEDICAL_EVIDENCE_PROVIDER === "gemini_flash"
              ? env.MEDICAL_EVIDENCE_MODEL
              : "mock-medical-evidence",
        clinicalFiles: {
          create: clinicalFiles.map((file) => ({ clinicalFileId: file.id }))
        },
        frameSamples: {
          create: frameSamples.map((sample) => ({ frameSampleId: sample.id }))
        }
      }
    });
  }
}

export function isClinicalArtifactType(artifactType: AiArtifactType) {
  return artifactType !== "medgemma_handoff_request";
}
