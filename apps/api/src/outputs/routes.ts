import {
  generatedOutputEditSchema,
  generatedOutputReviewSchema,
  type AiArtifactType
} from "@matria/shared";
import { Prisma, type GeneratedOutputType } from "@prisma/client";
import { Router } from "express";
import { writeAudit } from "../audit.js";
import { requirePermission } from "../auth/middleware.js";
import { prisma } from "../db/prisma.js";
import { AppError, notFound } from "../http/errors.js";
import { requiredParam } from "../http/params.js";
import { sendOk } from "../http/responses.js";

export const outputsRouter = Router();

outputsRouter.get(
  "/ambient-sessions/:sessionId/generated-outputs",
  requirePermission("encounter:read"),
  async (req, res, next) => {
    try {
      const generatedOutputs = await prisma.generatedOutput.findMany({
        where: { ambientSessionId: requiredParam(req, "sessionId") },
        include: { approvals: { orderBy: { createdAt: "desc" }, take: 5 } },
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }]
      });
      return sendOk(req, res, { generatedOutputs });
    } catch (error) {
      return next(error);
    }
  }
);

outputsRouter.post(
  "/outputs/:outputId/approve",
  requirePermission("output:approve"),
  async (req, res, next) => {
    try {
      const input = generatedOutputReviewSchema.parse(req.body);
      return sendOk(
        req,
        res,
        await reviewGeneratedOutput({
          outputId: requiredParam(req, "outputId"),
          actorId: req.currentUser!.id,
          requestId: req.requestId,
          action: "approve",
          note: input.note,
          editedContent: input.editedContent
        })
      );
    } catch (error) {
      return next(error);
    }
  }
);

outputsRouter.post(
  "/outputs/:outputId/edit",
  requirePermission("output:approve"),
  async (req, res, next) => {
    try {
      const input = generatedOutputEditSchema.parse(req.body);
      return sendOk(
        req,
        res,
        await reviewGeneratedOutput({
          outputId: requiredParam(req, "outputId"),
          actorId: req.currentUser!.id,
          requestId: req.requestId,
          action: "edit",
          note: input.note,
          editedContent: input.editedContent
        })
      );
    } catch (error) {
      return next(error);
    }
  }
);

outputsRouter.post(
  "/outputs/:outputId/reject",
  requirePermission("output:approve"),
  async (req, res, next) => {
    try {
      const input = generatedOutputReviewSchema.parse(req.body);
      return sendOk(
        req,
        res,
        await reviewGeneratedOutput({
          outputId: requiredParam(req, "outputId"),
          actorId: req.currentUser!.id,
          requestId: req.requestId,
          action: "reject",
          note: input.note
        })
      );
    } catch (error) {
      return next(error);
    }
  }
);

outputsRouter.post(
  "/outputs/:outputId/mark-uncertain",
  requirePermission("output:approve"),
  async (req, res, next) => {
    try {
      const input = generatedOutputReviewSchema.parse(req.body);
      return sendOk(
        req,
        res,
        await reviewGeneratedOutput({
          outputId: requiredParam(req, "outputId"),
          actorId: req.currentUser!.id,
          requestId: req.requestId,
          action: "mark_uncertain",
          note: input.note,
          editedContent: input.editedContent
        })
      );
    } catch (error) {
      return next(error);
    }
  }
);

async function reviewGeneratedOutput(input: {
  outputId: string;
  actorId: string;
  requestId: string;
  action: "approve" | "edit" | "reject" | "mark_uncertain" | "acknowledge";
  note?: string;
  editedContent?: Record<string, unknown>;
}) {
  const existing = await prisma.generatedOutput.findUnique({
    where: { id: input.outputId }
  });
  if (!existing) throw notFound("Generated output");
  if (["approved", "edited"].includes(existing.status) && input.action === "reject") {
    throw new AppError("INVALID_STATE_TRANSITION", "Approved output cannot be rejected.", 409);
  }

  const nextStatus = {
    approve: "approved",
    edit: "edited",
    reject: "rejected",
    mark_uncertain: "uncertain",
    acknowledge: "acknowledged"
  }[input.action] as typeof existing.status;

  const canonicalContent =
    input.action === "edit" || (input.action === "approve" && input.editedContent)
      ? (input.editedContent as Prisma.InputJsonValue)
      : toInputJson(existing.canonicalContent ?? existing.content);

  const result = await prisma.$transaction(async (tx) => {
    const generatedOutput = await tx.generatedOutput.update({
      where: { id: existing.id },
      data: {
        status: nextStatus,
        canonicalContent,
        reviewedAt: new Date(),
        reviewedById: input.actorId
      }
    });
    const approval = await tx.clinicalApproval.create({
      data: {
        generatedOutputId: existing.id,
        action: input.action,
        actorId: input.actorId,
        note: input.note,
        editedContent: input.editedContent ? (input.editedContent as Prisma.InputJsonValue) : undefined,
        previousStatus: existing.status,
        nextStatus,
        provenance: {
          sourceArtifactRevisionId: existing.artifactRevisionId,
          sourceEvidenceFindingId: existing.evidenceFindingId,
          outputType: existing.outputType
        } as Prisma.InputJsonValue
      }
    });
    return { generatedOutput, approval };
  });

  await writeAudit({
    actorId: input.actorId,
    action: `generated_output.${input.action}`,
    targetType: "generated_output",
    targetId: existing.id,
    outcome: "success",
    requestId: input.requestId,
    metadata: {
      previousStatus: existing.status,
      nextStatus,
      outputType: existing.outputType,
      ambientSessionId: existing.ambientSessionId
    }
  });
  return result;
}

export async function syncGeneratedOutputForArtifact(
  tx: Prisma.TransactionClient,
  artifact: {
    id: string;
    ambientSessionId: string;
    artifactType: AiArtifactType;
    content: Prisma.JsonValue;
    sourceReferences: Prisma.JsonValue;
    confidence: number | null;
    uncertaintyReasons: Prisma.JsonValue;
    validationStatus: string;
    reviewStatus: string;
  }
) {
  if (artifact.artifactType === "medgemma_handoff_request") return;
  const status = artifact.reviewStatus === "stale" ? "stale" : "review_required";
  await tx.generatedOutput.upsert({
    where: { artifactRevisionId: artifact.id },
    create: {
      ambientSessionId: artifact.ambientSessionId,
      artifactRevisionId: artifact.id,
      outputType: outputTypeForArtifact(artifact.artifactType),
      title: titleForArtifact(artifact.artifactType, artifact.content),
      content: toInputJson(artifact.content),
      status,
      sourceReferences: toInputJson(artifact.sourceReferences),
      confidence: artifact.confidence,
      uncertaintyReasons: toInputJson(artifact.uncertaintyReasons),
      canonicalContent: toInputJson(artifact.content)
    },
    update: {
      title: titleForArtifact(artifact.artifactType, artifact.content),
      content: toInputJson(artifact.content),
      status,
      sourceReferences: toInputJson(artifact.sourceReferences),
      confidence: artifact.confidence,
      uncertaintyReasons: toInputJson(artifact.uncertaintyReasons)
    }
  });
}

export async function syncGeneratedOutputForEvidenceFinding(findingId: string) {
  const finding = await prisma.medicalEvidenceFinding.findUnique({ where: { id: findingId } });
  if (!finding) throw notFound("Medical evidence finding");
  return prisma.generatedOutput.upsert({
    where: { evidenceFindingId: finding.id },
    create: {
      ambientSessionId: finding.ambientSessionId,
      evidenceFindingId: finding.id,
      outputType: "medical_evidence",
      title: `Evidence finding: ${finding.taskType}`,
      content: {
        findings: finding.findings,
        extractedValues: finding.extractedValues,
        frameReferences: finding.frameReferences,
        sourceEvidence: finding.sourceEvidence,
        provider: finding.provider,
        model: finding.model
      },
      status: "review_required",
      sourceReferences: toInputJson(finding.sourceEvidence),
      confidence: finding.confidence,
      uncertaintyReasons: toInputJson(finding.uncertaintyReasons),
      canonicalContent: {
        findings: finding.findings,
        extractedValues: finding.extractedValues
      }
    },
    update: {
      content: {
        findings: finding.findings,
        extractedValues: finding.extractedValues,
        frameReferences: finding.frameReferences,
        sourceEvidence: finding.sourceEvidence,
        provider: finding.provider,
        model: finding.model
      },
      sourceReferences: toInputJson(finding.sourceEvidence),
      confidence: finding.confidence,
      uncertaintyReasons: toInputJson(finding.uncertaintyReasons)
    }
  });
}

function toInputJson(value: Prisma.JsonValue | null | undefined) {
  return value === null || value === undefined ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
}

function outputTypeForArtifact(artifactType: AiArtifactType): GeneratedOutputType {
  return (
    {
      summary_update: "summary",
      session_note_draft_sections: "note_draft",
      anc_note_draft: "note_draft",
      teleconsult_summary_draft: "teleconsult_summary",
      referral_summary_draft: "referral_summary",
      fhir_export_draft_inputs: "fhir_draft_input",
      missing_questions: "missing_questions",
      requires_human_review: "risk_synthesis",
      highlight_cards: "risk_synthesis",
      suggestions: "other",
      medgemma_handoff_request: "other"
    } satisfies Record<AiArtifactType, GeneratedOutputType>
  )[artifactType];
}

function titleForArtifact(artifactType: AiArtifactType, content: Prisma.JsonValue) {
  if (content && typeof content === "object" && !Array.isArray(content)) {
    const maybeTitle = (content as Record<string, unknown>).title;
    if (typeof maybeTitle === "string" && maybeTitle.trim()) return maybeTitle.slice(0, 180);
  }
  return (
    {
      summary_update: "Progressive summary draft",
      highlight_cards: "Risk synthesis draft",
      suggestions: "Suggestions draft",
      missing_questions: "Missing questions draft",
      session_note_draft_sections: "Session note draft",
      anc_note_draft: "ANC note draft",
      teleconsult_summary_draft: "Teleconsult summary draft",
      referral_summary_draft: "Referral summary draft",
      fhir_export_draft_inputs: "FHIR draft input",
      medgemma_handoff_request: "Evidence handoff request",
      requires_human_review: "Review-required draft"
    } satisfies Record<AiArtifactType, string>
  )[artifactType];
}
