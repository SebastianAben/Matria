import {
  audioEventCreateSchema,
  transcriptTurnCreateSchema,
  transcriptTurnPatchSchema
} from "@matria/shared";
import type { Prisma } from "@prisma/client";
import { Router } from "express";
import { writeAudit } from "../audit.js";
import { requirePermission } from "../auth/middleware.js";
import { getEncounterOrThrow, requireConsent } from "../clinical/scope.js";
import { prisma } from "../db/prisma.js";
import { AppError, notFound } from "../http/errors.js";
import { requiredParam } from "../http/params.js";
import { sendOk } from "../http/responses.js";
import { extractTranscriptCandidates } from "./candidate-extractor.js";
import { mapDiarizedWordsToTurns } from "./diarization.js";
import { createSpeechToTextProvider } from "./stt-provider.js";

export const ambientRouter = Router();

ambientRouter.post(
  "/encounters/:encounterId/ambient-sessions",
  requirePermission("ambient_session:start"),
  async (req, res, next) => {
    try {
      const encounter = await getEncounterOrThrow(requiredParam(req, "encounterId"));
      const hasAudioConsent = await hasConsent(encounter.id, "audio");
      const hasTranscriptConsent = await hasConsent(encounter.id, "transcript");
      const ambientSession = await prisma.ambientSessionState.create({
        data: {
          encounterId: encounter.id,
          status: hasAudioConsent && hasTranscriptConsent ? "initialized" : "consent_pending",
          provider: createSpeechToTextProvider().name,
          providerState: { consent: { audio: hasAudioConsent, transcript: hasTranscriptConsent } },
          createdById: req.currentUser!.id
        }
      });
      await writeAudit({
        actorId: req.currentUser!.id,
        action: "ambient_session.create",
        targetType: "ambient_session",
        targetId: ambientSession.id,
        outcome: "success",
        requestId: req.requestId,
        metadata: { encounterId: encounter.id, status: ambientSession.status }
      });
      return sendOk(req, res, { ambientSession }, 201);
    } catch (error) {
      return next(error);
    }
  }
);

ambientRouter.get(
  "/ambient-sessions/:sessionId",
  requirePermission("encounter:read"),
  async (req, res, next) => {
    try {
      const ambientSession = await prisma.ambientSessionState.findUnique({
        where: { id: requiredParam(req, "sessionId") },
        include: {
          encounter: { include: { patient: true, pregnancyEpisode: true } },
          transcriptTurns: { orderBy: { startTimeMs: "asc" } },
          transcriptClinicalCandidates: { orderBy: { createdAt: "desc" } }
        }
      });
      if (!ambientSession) throw notFound("Ambient session");
      return sendOk(req, res, { ambientSession });
    } catch (error) {
      return next(error);
    }
  }
);

ambientRouter.post(
  "/ambient-sessions/:sessionId/start",
  requirePermission("ambient_session:start"),
  async (req, res, next) => {
    try {
      const ambientSession = await getAmbientSession(requiredParam(req, "sessionId"));
      await requireConsent(ambientSession.encounterId, "audio");
      await requireConsent(ambientSession.encounterId, "transcript");
      if (!["initialized", "consent_pending", "closed", "failed"].includes(ambientSession.status)) {
        throw new AppError("INVALID_STATE_TRANSITION", "Ambient session cannot start now.", 409);
      }
      const updated = await prisma.ambientSessionState.update({
        where: { id: ambientSession.id },
        data: {
          status: "listening",
          startedAt: new Date(),
          stoppedAt: null,
          failedAt: null,
          failureReason: null,
          stateVersion: { increment: 1 }
        }
      });
      await writeAudit({
        actorId: req.currentUser!.id,
        action: "ambient_session.start",
        targetType: "ambient_session",
        targetId: updated.id,
        outcome: "success",
        requestId: req.requestId
      });
      return sendOk(req, res, { ambientSession: updated });
    } catch (error) {
      return next(error);
    }
  }
);

ambientRouter.post(
  "/ambient-sessions/:sessionId/stop",
  requirePermission("ambient_session:start"),
  async (req, res, next) => {
    try {
      const ambientSession = await getAmbientSession(requiredParam(req, "sessionId"));
      if (ambientSession.status === "closed") {
        throw new AppError("INVALID_STATE_TRANSITION", "Ambient session is already closed.", 409);
      }
      const updated = await prisma.ambientSessionState.update({
        where: { id: ambientSession.id },
        data: { status: "closed", stoppedAt: new Date(), stateVersion: { increment: 1 } }
      });
      await writeAudit({
        actorId: req.currentUser!.id,
        action: "ambient_session.stop",
        targetType: "ambient_session",
        targetId: updated.id,
        outcome: "success",
        requestId: req.requestId
      });
      return sendOk(req, res, { ambientSession: updated });
    } catch (error) {
      return next(error);
    }
  }
);

ambientRouter.post(
  "/ambient-sessions/:sessionId/audio-events",
  requirePermission("audio:process"),
  async (req, res, next) => {
    try {
      const ambientSession = await getAmbientSession(requiredParam(req, "sessionId"));
      await requireConsent(ambientSession.encounterId, "audio");
      await requireConsent(ambientSession.encounterId, "transcript");
      if (
        !["listening", "transcribing", "diarizing", "normalizing"].includes(ambientSession.status)
      ) {
        throw new AppError("INVALID_STATE_TRANSITION", "Ambient session is not listening.", 409);
      }

      const input = audioEventCreateSchema.parse(req.body);
      const audioSegment = await prisma.audioSegment.create({
        data: {
          ambientSessionId: ambientSession.id,
          sequence: input.sequence,
          mimeType: input.mimeType,
          durationMs: input.durationMs,
          byteLength: input.byteLength,
          storageUri: input.storageUri,
          transcriptText: input.transcriptText
        }
      });

      await writeAudit({
        actorId: req.currentUser!.id,
        action: "audio_event.ingest",
        targetType: "audio_segment",
        targetId: audioSegment.id,
        outcome: "success",
        requestId: req.requestId,
        metadata: { ambientSessionId: ambientSession.id, sequence: input.sequence }
      });

      const provider = createSpeechToTextProvider();
      await prisma.ambientSessionState.update({
        where: { id: ambientSession.id },
        data: { status: "transcribing", stateVersion: { increment: 1 } }
      });

      try {
        const providerResult = await provider.processAudioEvent(input);
        const turnDrafts = mapDiarizedWordsToTurns(providerResult);
        const turns = await prisma.$transaction(async (tx) => {
          await tx.audioSegment.update({
            where: { id: audioSegment.id },
            data: { providerStatus: "success" }
          });
          await tx.ambientSessionState.update({
            where: { id: ambientSession.id },
            data: {
              status: "normalizing",
              providerState: {
                provider: provider.name,
                lastSequence: input.sequence,
                transcriptLength: providerResult.transcript.length
              },
              stateVersion: { increment: 1 }
            }
          });
          const createdTurns = [];
          for (const draft of turnDrafts) {
            createdTurns.push(
              await tx.transcriptTurn.create({
                data: {
                  ambientSessionId: ambientSession.id,
                  sourceAudioSegmentId: audioSegment.id,
                  speakerLabel: draft.speakerLabel,
                  speakerRoleGuess: draft.speakerRoleGuess,
                  roleConfidence: draft.roleConfidence,
                  startTimeMs: draft.startTimeMs,
                  endTimeMs: draft.endTimeMs,
                  text: draft.text,
                  languageCode: draft.languageCode,
                  sttConfidence: draft.sttConfidence,
                  diarizationConfidence: draft.diarizationConfidence,
                  correctionStatus: provider.name === "google" ? "auto_diarized" : "raw"
                }
              })
            );
          }
          return createdTurns;
        });

        await createCandidates(ambientSession.id, turns);
        await prisma.ambientSessionState.update({
          where: { id: ambientSession.id },
          data: { status: "listening", stateVersion: { increment: 1 } }
        });
        await writeAudit({
          actorId: req.currentUser!.id,
          action: "stt.provider_result",
          targetType: "ambient_session",
          targetId: ambientSession.id,
          outcome: "success",
          requestId: req.requestId,
          metadata: { provider: provider.name, turnCount: turns.length }
        });
        return sendOk(req, res, { audioSegment, transcriptTurns: turns }, 201);
      } catch (error) {
        const message = error instanceof Error ? error.message : "STT provider failed.";
        await prisma.audioSegment.update({
          where: { id: audioSegment.id },
          data: { providerStatus: "failure" }
        });
        await prisma.ambientSessionState.update({
          where: { id: ambientSession.id },
          data: {
            status: "failed",
            failedAt: new Date(),
            failureReason: message,
            stateVersion: { increment: 1 }
          }
        });
        await writeAudit({
          actorId: req.currentUser!.id,
          action: "stt.provider_failure",
          targetType: "ambient_session",
          targetId: ambientSession.id,
          outcome: "failure",
          requestId: req.requestId,
          metadata: { provider: provider.name, message }
        });
        throw new AppError("INTERNAL_ERROR", message, 502);
      }
    } catch (error) {
      return next(error);
    }
  }
);

ambientRouter.get(
  "/ambient-sessions/:sessionId/transcript-turns",
  requirePermission("encounter:read"),
  async (req, res, next) => {
    try {
      const ambientSession = await getAmbientSession(requiredParam(req, "sessionId"));
      const transcriptTurns = await prisma.transcriptTurn.findMany({
        where: { ambientSessionId: ambientSession.id },
        orderBy: [{ startTimeMs: "asc" }, { createdAt: "asc" }]
      });
      return sendOk(req, res, { transcriptTurns });
    } catch (error) {
      return next(error);
    }
  }
);

ambientRouter.post(
  "/ambient-sessions/:sessionId/transcript-turns",
  requirePermission("transcript:correct"),
  async (req, res, next) => {
    try {
      const ambientSession = await getAmbientSession(requiredParam(req, "sessionId"));
      await requireConsent(ambientSession.encounterId, "transcript");
      const input = transcriptTurnCreateSchema.parse(req.body);
      const transcriptTurn = await prisma.transcriptTurn.create({
        data: {
          ambientSessionId: ambientSession.id,
          sourceAudioSegmentId: input.sourceAudioSegmentId,
          speakerLabel: input.speakerLabel,
          speakerRoleGuess: input.speakerRoleGuess,
          roleConfidence: input.roleConfidence,
          startTimeMs: input.startTimeMs,
          endTimeMs: input.endTimeMs,
          text: input.text,
          languageCode: input.languageCode,
          sttConfidence: input.sttConfidence,
          diarizationConfidence: input.diarizationConfidence,
          correctionStatus: "clinician_corrected",
          correctedById: req.currentUser!.id,
          correctedAt: new Date()
        }
      });
      await createCandidates(ambientSession.id, [transcriptTurn]);
      await writeAudit({
        actorId: req.currentUser!.id,
        action: "transcript_turn.create",
        targetType: "transcript_turn",
        targetId: transcriptTurn.id,
        outcome: "success",
        requestId: req.requestId,
        metadata: { ambientSessionId: ambientSession.id }
      });
      return sendOk(req, res, { transcriptTurn }, 201);
    } catch (error) {
      return next(error);
    }
  }
);

ambientRouter.patch(
  "/transcript-turns/:turnId",
  requirePermission("transcript:correct"),
  async (req, res, next) => {
    try {
      const input = transcriptTurnPatchSchema.parse(req.body);
      const existing = await prisma.transcriptTurn.findUnique({
        where: { id: requiredParam(req, "turnId") },
        include: { ambientSession: true }
      });
      if (!existing) throw notFound("Transcript turn");
      await requireConsent(existing.ambientSession.encounterId, "transcript");
      const transcriptTurn = await prisma.transcriptTurn.update({
        where: { id: existing.id },
        data: {
          speakerLabel: input.speakerLabel,
          speakerRoleGuess: input.speakerRoleGuess,
          text: input.text,
          correctionStatus: "clinician_corrected",
          correctedById: req.currentUser!.id,
          correctedAt: new Date()
        }
      });
      await createCandidates(existing.ambientSessionId, [transcriptTurn]);
      await writeAudit({
        actorId: req.currentUser!.id,
        action: "transcript_turn.correct",
        targetType: "transcript_turn",
        targetId: transcriptTurn.id,
        outcome: "success",
        requestId: req.requestId
      });
      return sendOk(req, res, { transcriptTurn });
    } catch (error) {
      return next(error);
    }
  }
);

async function getAmbientSession(sessionId: string) {
  const ambientSession = await prisma.ambientSessionState.findUnique({ where: { id: sessionId } });
  if (!ambientSession) throw notFound("Ambient session");
  return ambientSession;
}

async function hasConsent(encounterId: string, mode: string) {
  const latest = await prisma.consentRecord.findFirst({
    where: { encounterId, mode: mode as never },
    orderBy: { createdAt: "desc" }
  });
  return latest?.status === "granted";
}

async function createCandidates(
  ambientSessionId: string,
  turns: Array<{ id: string; text: string; speakerRoleGuess: string }>
) {
  const ambientSession = await prisma.ambientSessionState.findUnique({
    where: { id: ambientSessionId },
    include: { encounter: { include: { sessionNote: true } } }
  });
  const candidates = extractTranscriptCandidates(
    turns.map((turn) => ({
      id: turn.id,
      text: turn.text,
      speakerRoleGuess: turn.speakerRoleGuess as never
    })),
    ambientSession?.encounter.sessionNote
  );
  for (const candidate of candidates) {
    await prisma.transcriptClinicalCandidate.create({
      data: {
        ambientSessionId,
        transcriptTurnId: candidate.transcriptTurnId,
        candidateType: candidate.candidateType,
        text: candidate.text,
        value: candidate.value as Prisma.InputJsonValue | undefined,
        sourceReferences: candidate.sourceReferences as Prisma.InputJsonValue,
        confidence: candidate.confidence
      }
    });
  }
  if (candidates.length > 0) {
    await writeAudit({
      actorId: null,
      action: "transcript_candidate.extract",
      targetType: "ambient_session",
      targetId: ambientSessionId,
      outcome: "success",
      requestId: "system",
      metadata: { candidateCount: candidates.length }
    });
  }
}
