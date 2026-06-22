import { contextSnapshotPayloadSchema } from "@matria/shared";
import type { Prisma } from "@prisma/client";
import { AppError, notFound } from "../http/errors.js";
import { requireConsent } from "../clinical/scope.js";
import { prisma } from "../db/prisma.js";

export async function buildAndPersistContextSnapshot(
  ambientSessionId: string,
  createdById: string | null
) {
  const ambientSession = await prisma.ambientSessionState.findUnique({
    where: { id: ambientSessionId },
    include: {
      encounter: {
        include: {
          patient: true,
          pregnancyEpisode: true,
          observations: { orderBy: { createdAt: "desc" } },
          clinicalFiles: { orderBy: { createdAt: "desc" } },
          sessionNote: true,
          ruleResults: {
            where: { status: { not: "superseded" } },
            orderBy: { createdAt: "desc" }
          }
        }
      },
      transcriptTurns: { orderBy: [{ startTimeMs: "asc" }, { createdAt: "asc" }] },
      transcriptClinicalCandidates: { orderBy: { createdAt: "desc" } },
      suggestions: {
        where: { status: { not: "superseded" } },
        include: { results: { orderBy: { createdAt: "desc" } } },
        orderBy: { updatedAt: "desc" }
      },
      artifactRevisions: {
        where: { validationStatus: "valid", reviewStatus: { not: "stale" } },
        orderBy: { createdAt: "desc" },
        take: 12
      },
      frameSamples: { orderBy: { createdAt: "desc" }, take: 30 },
      evidenceFindings: { orderBy: { createdAt: "desc" }, take: 30 }
    }
  });
  if (!ambientSession) throw notFound("Ambient session");
  await requireConsent(ambientSession.encounterId, "ai");

  const { encounter } = ambientSession;
  if (encounter.pregnancyEpisode.patientId !== encounter.patientId) {
    throw new AppError("SCOPE_MISMATCH", "Encounter scope is inconsistent.", 409);
  }

  const patientMemory = await prisma.patientMemoryFact.findMany({
    where: {
      patientId: encounter.patientId,
      pregnancyEpisodeId: encounter.pregnancyEpisodeId,
      status: "approved"
    },
    orderBy: { createdAt: "desc" },
    take: 10
  });

  const payload = contextSnapshotPayloadSchema.parse({
    safetyPosture: {
      decisionSupportOnly: true,
      clinicianReviewRequired: true,
      noDiagnosisPrescriptionOrFinalTriage: true
    },
    patient: {
      id: encounter.patient.id,
      hospitalNumber: encounter.patient.hospitalNumber,
      fullName: encounter.patient.fullName,
      dateOfBirth: encounter.patient.dateOfBirth?.toISOString() ?? null
    },
    pregnancyEpisode: {
      id: encounter.pregnancyEpisode.id,
      label: encounter.pregnancyEpisode.label,
      estimatedDueDate: encounter.pregnancyEpisode.estimatedDueDate?.toISOString() ?? null,
      gestationalAgeWeeks: encounter.pregnancyEpisode.gestationalAgeWeeks,
      status: encounter.pregnancyEpisode.status
    },
    encounter: {
      id: encounter.id,
      status: encounter.status,
      visitType: encounter.visitType,
      facilityName: encounter.facilityName,
      createdAt: encounter.createdAt.toISOString()
    },
    ambientSession: {
      id: ambientSession.id,
      status: ambientSession.status,
      stateVersion: ambientSession.stateVersion,
      provider: ambientSession.provider,
      failedAt: ambientSession.failedAt?.toISOString() ?? null,
      failureReason: ambientSession.failureReason
    },
    sessionNote: encounter.sessionNote
      ? {
          id: encounter.sessionNote.id,
          content: encounter.sessionNote.content,
          version: encounter.sessionNote.version,
          updatedAt: encounter.sessionNote.updatedAt.toISOString()
        }
      : null,
    observations: encounter.observations.map((observation) => ({
      id: observation.id,
      type: observation.type,
      value: observation.value,
      verificationStatus: observation.verificationStatus,
      source: observation.source,
      createdAt: observation.createdAt.toISOString()
    })),
    transcriptTurns: ambientSession.transcriptTurns.map((turn) => ({
      id: turn.id,
      speakerLabel: turn.speakerLabel,
      speakerRoleGuess: turn.speakerRoleGuess,
      startTimeMs: turn.startTimeMs,
      endTimeMs: turn.endTimeMs,
      text: turn.text,
      languageCode: turn.languageCode,
      sttConfidence: turn.sttConfidence,
      diarizationConfidence: turn.diarizationConfidence,
      correctionStatus: turn.correctionStatus
    })),
    transcriptCandidates: ambientSession.transcriptClinicalCandidates.map((candidate) => ({
      id: candidate.id,
      transcriptTurnId: candidate.transcriptTurnId,
      candidateType: candidate.candidateType,
      text: candidate.text,
      value: candidate.value,
      sourceReferences: candidate.sourceReferences,
      confidence: candidate.confidence,
      status: candidate.status
    })),
    ruleResults: encounter.ruleResults.map((rule) => ({
      id: rule.id,
      ruleId: rule.ruleId,
      ruleVersion: rule.ruleVersion,
      severity: rule.severity,
      blockingLevel: rule.blockingLevel,
      actionType: rule.actionType,
      evidence: rule.evidence,
      sourceReferences: rule.sourceReferences,
      confidence: rule.confidence,
      suggestedAction: rule.suggestedAction,
      status: rule.status,
      thresholdDescription: rule.thresholdDescription
    })),
    suggestions: ambientSession.suggestions.map((suggestion) => ({
      id: suggestion.id,
      title: suggestion.title,
      rationale: suggestion.rationale,
      priority: suggestion.priority,
      status: suggestion.status,
      sourceReferences: suggestion.sourceReferences,
      resultOptions: suggestion.resultOptions,
      results: suggestion.results.map((result) => ({
        id: result.id,
        selectedOptionValue: result.selectedOptionValue,
        selectedOptionLabel: result.selectedOptionLabel,
        freeTextNote: result.freeTextNote,
        contextImpact: result.contextImpact,
        createdAt: result.createdAt.toISOString()
      }))
    })),
    priorArtifacts: ambientSession.artifactRevisions.map((artifact) => ({
      id: artifact.id,
      artifactType: artifact.artifactType,
      operation: artifact.operation,
      content: artifact.content,
      sourceReferences: artifact.sourceReferences,
      confidence: artifact.confidence,
      uncertaintyReasons: artifact.uncertaintyReasons,
      ruleResultReferences: artifact.ruleResultReferences,
      memoryReferences: artifact.memoryReferences,
      reviewStatus: artifact.reviewStatus,
      createdAt: artifact.createdAt.toISOString()
    })),
    clinicalFiles: encounter.clinicalFiles.map((file) => ({
      id: file.id,
      kind: file.kind,
      fileName: file.fileName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      storageUri: file.storageUri,
      storageProvider: file.storageProvider,
      checksumSha256: file.checksumSha256,
      metadata: file.metadata,
      createdAt: file.createdAt.toISOString()
    })),
    mediaFrameSamples: ambientSession.frameSamples.map((sample) => ({
      id: sample.id,
      clinicalFileId: sample.clinicalFileId,
      sourceTimestampMs: sample.sourceTimestampMs,
      frameIndex: sample.frameIndex,
      mimeType: sample.mimeType,
      width: sample.width,
      height: sample.height,
      checksumSha256: sample.checksumSha256,
      qualityMetadata: sample.qualityMetadata,
      processingStatus: sample.processingStatus,
      failureReason: sample.failureReason,
      createdAt: sample.createdAt.toISOString()
    })),
    medicalEvidenceFindings: ambientSession.evidenceFindings.map((finding) => ({
      id: finding.id,
      handoffId: finding.handoffId,
      clinicalFileId: finding.clinicalFileId,
      frameSampleId: finding.frameSampleId,
      provider: finding.provider,
      model: finding.model,
      taskType: finding.taskType,
      findings: finding.findings,
      extractedValues: finding.extractedValues,
      frameReferences: finding.frameReferences,
      sourceEvidence: finding.sourceEvidence,
      confidence: finding.confidence,
      uncertaintyReasons: finding.uncertaintyReasons,
      qualityLimitations: finding.qualityLimitations,
      clinicianReviewRequired: finding.clinicianReviewRequired,
      reviewStatus: finding.reviewStatus,
      createdAt: finding.createdAt.toISOString()
    })),
    patientMemory: patientMemory.map((memory) => ({
      id: memory.id,
      content: memory.content,
      sourceType: memory.sourceType,
      sourceId: memory.sourceId,
      provenance: memory.provenance,
      createdAt: memory.createdAt.toISOString()
    })),
    outputContract: {
      artifactTypes: [
        "summary_update",
        "highlight_cards",
        "suggestions",
        "missing_questions",
        "session_note_draft_sections",
        "anc_note_draft",
        "teleconsult_summary_draft",
        "referral_summary_draft",
        "fhir_export_draft_inputs",
        "medgemma_handoff_request",
        "requires_human_review"
      ],
      patchOperations: ["create", "update", "replace", "archive", "no_change"]
    }
  });

  const sourceManifest = {
    observationIds: encounter.observations.map((observation) => observation.id),
    transcriptTurnIds: ambientSession.transcriptTurns.map((turn) => turn.id),
    transcriptCandidateIds: ambientSession.transcriptClinicalCandidates.map(
      (candidate) => candidate.id
    ),
    ruleResultIds: encounter.ruleResults.map((rule) => rule.id),
    suggestionIds: ambientSession.suggestions.map((suggestion) => suggestion.id),
    artifactRevisionIds: ambientSession.artifactRevisions.map((artifact) => artifact.id),
    clinicalFileIds: encounter.clinicalFiles.map((file) => file.id),
    mediaFrameSampleIds: ambientSession.frameSamples.map((sample) => sample.id),
    medicalEvidenceFindingIds: ambientSession.evidenceFindings.map((finding) => finding.id),
    patientMemoryFactIds: patientMemory.map((memory) => memory.id)
  };

  return prisma.contextSnapshot.create({
    data: {
      patientId: encounter.patientId,
      pregnancyEpisodeId: encounter.pregnancyEpisodeId,
      encounterId: encounter.id,
      ambientSessionId: ambientSession.id,
      sessionStateVersion: ambientSession.stateVersion,
      sessionNoteVersion: encounter.sessionNote?.version ?? 0,
      payload: payload as Prisma.InputJsonValue,
      sourceManifest: sourceManifest as Prisma.InputJsonValue,
      createdById
    }
  });
}
