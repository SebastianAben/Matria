-- CreateEnum
CREATE TYPE "RuleSeverity" AS ENUM ('info', 'watch', 'warning', 'critical');

-- CreateEnum
CREATE TYPE "RuleBlockingLevel" AS ENUM ('none', 'soft', 'ack_required', 'hard');

-- CreateEnum
CREATE TYPE "RuleResultStatus" AS ENUM ('active', 'acknowledged', 'resolved', 'overridden', 'superseded');

-- CreateEnum
CREATE TYPE "RuleActionType" AS ENUM ('suggestion', 'missing_question', 'acknowledge', 'review', 'escalation_review');

-- CreateEnum
CREATE TYPE "RuleEvaluationRunStatus" AS ENUM ('completed', 'failed');

-- CreateEnum
CREATE TYPE "AmbientSessionStatus" AS ENUM ('initialized', 'consent_pending', 'listening', 'transcribing', 'diarizing', 'normalizing', 'closed', 'failed');

-- CreateEnum
CREATE TYPE "TranscriptCorrectionStatus" AS ENUM ('raw', 'auto_diarized', 'clinician_corrected', 'system_revised');

-- CreateEnum
CREATE TYPE "SpeakerRoleGuess" AS ENUM ('clinician', 'patient', 'companion', 'unknown');

-- CreateEnum
CREATE TYPE "TranscriptClinicalCandidateType" AS ENUM ('symptom_mention', 'danger_sign_mention', 'medication_mention', 'history_mention', 'gestational_age_mention', 'clinician_plan', 'unresolved_question');

-- CreateTable
CREATE TABLE "RuleEvaluationRun" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "encounterId" UUID NOT NULL,
    "triggeredById" UUID,
    "status" "RuleEvaluationRunStatus" NOT NULL DEFAULT 'completed',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "RuleEvaluationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleResult" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "evaluationRunId" UUID,
    "encounterId" UUID NOT NULL,
    "ambientSessionId" UUID,
    "ruleId" TEXT NOT NULL,
    "ruleVersion" TEXT NOT NULL,
    "severity" "RuleSeverity" NOT NULL,
    "blockingLevel" "RuleBlockingLevel" NOT NULL,
    "actionType" "RuleActionType" NOT NULL,
    "evidence" JSONB NOT NULL,
    "sourceReferences" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "suggestedAction" TEXT NOT NULL,
    "needsLocalGuidelineValidation" BOOLEAN NOT NULL DEFAULT false,
    "thresholdDescription" TEXT,
    "status" "RuleResultStatus" NOT NULL DEFAULT 'active',
    "acknowledgementNote" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RuleResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmbientSessionState" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "encounterId" UUID NOT NULL,
    "status" "AmbientSessionStatus" NOT NULL DEFAULT 'initialized',
    "stateVersion" INTEGER NOT NULL DEFAULT 1,
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "providerState" JSONB,
    "startedAt" TIMESTAMP(3),
    "stoppedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmbientSessionState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudioSegment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ambientSessionId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "durationMs" INTEGER,
    "byteLength" INTEGER,
    "storageUri" TEXT,
    "transcriptText" TEXT,
    "providerStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AudioSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptTurn" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ambientSessionId" UUID NOT NULL,
    "sourceAudioSegmentId" UUID,
    "speakerLabel" TEXT NOT NULL,
    "speakerRoleGuess" "SpeakerRoleGuess" NOT NULL DEFAULT 'unknown',
    "roleConfidence" DOUBLE PRECISION,
    "startTimeMs" INTEGER NOT NULL,
    "endTimeMs" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL DEFAULT 'en-US',
    "sttConfidence" DOUBLE PRECISION,
    "diarizationConfidence" DOUBLE PRECISION,
    "correctionStatus" "TranscriptCorrectionStatus" NOT NULL DEFAULT 'raw',
    "correctedById" UUID,
    "correctedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TranscriptTurn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptClinicalCandidate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ambientSessionId" UUID NOT NULL,
    "transcriptTurnId" UUID,
    "candidateType" "TranscriptClinicalCandidateType" NOT NULL,
    "text" TEXT NOT NULL,
    "value" JSONB,
    "sourceReferences" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'unverified',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TranscriptClinicalCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RuleEvaluationRun_encounterId_createdAt_idx" ON "RuleEvaluationRun"("encounterId", "createdAt");

-- CreateIndex
CREATE INDEX "RuleResult_encounterId_status_idx" ON "RuleResult"("encounterId", "status");

-- CreateIndex
CREATE INDEX "RuleResult_ruleId_ruleVersion_idx" ON "RuleResult"("ruleId", "ruleVersion");

-- CreateIndex
CREATE INDEX "AmbientSessionState_encounterId_status_idx" ON "AmbientSessionState"("encounterId", "status");

-- CreateIndex
CREATE INDEX "AudioSegment_ambientSessionId_createdAt_idx" ON "AudioSegment"("ambientSessionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AudioSegment_ambientSessionId_sequence_key" ON "AudioSegment"("ambientSessionId", "sequence");

-- CreateIndex
CREATE INDEX "TranscriptTurn_ambientSessionId_startTimeMs_idx" ON "TranscriptTurn"("ambientSessionId", "startTimeMs");

-- CreateIndex
CREATE INDEX "TranscriptClinicalCandidate_ambientSessionId_candidateType_idx" ON "TranscriptClinicalCandidate"("ambientSessionId", "candidateType");

-- AddForeignKey
ALTER TABLE "RuleEvaluationRun" ADD CONSTRAINT "RuleEvaluationRun_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleResult" ADD CONSTRAINT "RuleResult_evaluationRunId_fkey" FOREIGN KEY ("evaluationRunId") REFERENCES "RuleEvaluationRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleResult" ADD CONSTRAINT "RuleResult_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleResult" ADD CONSTRAINT "RuleResult_ambientSessionId_fkey" FOREIGN KEY ("ambientSessionId") REFERENCES "AmbientSessionState"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleResult" ADD CONSTRAINT "RuleResult_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmbientSessionState" ADD CONSTRAINT "AmbientSessionState_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmbientSessionState" ADD CONSTRAINT "AmbientSessionState_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudioSegment" ADD CONSTRAINT "AudioSegment_ambientSessionId_fkey" FOREIGN KEY ("ambientSessionId") REFERENCES "AmbientSessionState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptTurn" ADD CONSTRAINT "TranscriptTurn_ambientSessionId_fkey" FOREIGN KEY ("ambientSessionId") REFERENCES "AmbientSessionState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptTurn" ADD CONSTRAINT "TranscriptTurn_sourceAudioSegmentId_fkey" FOREIGN KEY ("sourceAudioSegmentId") REFERENCES "AudioSegment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptTurn" ADD CONSTRAINT "TranscriptTurn_correctedById_fkey" FOREIGN KEY ("correctedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptClinicalCandidate" ADD CONSTRAINT "TranscriptClinicalCandidate_ambientSessionId_fkey" FOREIGN KEY ("ambientSessionId") REFERENCES "AmbientSessionState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptClinicalCandidate" ADD CONSTRAINT "TranscriptClinicalCandidate_transcriptTurnId_fkey" FOREIGN KEY ("transcriptTurnId") REFERENCES "TranscriptTurn"("id") ON DELETE SET NULL ON UPDATE CASCADE;
