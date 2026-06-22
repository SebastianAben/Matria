CREATE TYPE "AiToolCallStatus" AS ENUM ('pending', 'succeeded', 'failed', 'validation_failed');
CREATE TYPE "AiArtifactType" AS ENUM (
  'summary_update',
  'highlight_cards',
  'suggestions',
  'missing_questions',
  'session_note_draft_sections',
  'anc_note_draft',
  'teleconsult_summary_draft',
  'referral_summary_draft',
  'fhir_export_draft_inputs',
  'medgemma_handoff_request',
  'requires_human_review'
);
CREATE TYPE "AiPatchOperation" AS ENUM ('create', 'update', 'replace', 'archive', 'no_change');
CREATE TYPE "AiValidationStatus" AS ENUM ('valid', 'invalid', 'stale');
CREATE TYPE "AiReviewStatus" AS ENUM ('draft', 'review_required', 'rejected', 'stale');
CREATE TYPE "SynthesisTickStatus" AS ENUM (
  'pending',
  'running',
  'completed',
  'failed',
  'validation_failed',
  'stale',
  'skipped'
);
CREATE TYPE "HighlightType" AS ENUM (
  'risk',
  'missing_context',
  'contradiction',
  'uncertainty',
  'memory',
  'media_evidence',
  'follow_up'
);
CREATE TYPE "SuggestionPriority" AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE "SuggestionStatus" AS ENUM ('open', 'done', 'skipped', 'needs_follow_up', 'superseded');

CREATE TABLE "ContextSnapshot" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "patientId" UUID NOT NULL,
  "pregnancyEpisodeId" UUID NOT NULL,
  "encounterId" UUID NOT NULL,
  "ambientSessionId" UUID NOT NULL,
  "sessionStateVersion" INTEGER NOT NULL,
  "sessionNoteVersion" INTEGER NOT NULL,
  "payload" JSONB NOT NULL,
  "sourceManifest" JSONB NOT NULL,
  "createdById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContextSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiToolCall" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ambientSessionId" UUID,
  "contextSnapshotId" UUID,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "toolName" TEXT NOT NULL,
  "status" "AiToolCallStatus" NOT NULL DEFAULT 'pending',
  "requestMetadata" JSONB,
  "responseMetadata" JSONB,
  "errorMessage" TEXT,
  "latencyMs" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "AiToolCall_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiArtifactRevision" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ambientSessionId" UUID NOT NULL,
  "contextSnapshotId" UUID NOT NULL,
  "artifactType" "AiArtifactType" NOT NULL,
  "operation" "AiPatchOperation" NOT NULL,
  "artifactKey" TEXT,
  "content" JSONB NOT NULL,
  "sourceReferences" JSONB NOT NULL,
  "confidence" DOUBLE PRECISION,
  "uncertaintyReasons" JSONB NOT NULL,
  "ruleResultReferences" JSONB NOT NULL,
  "memoryReferences" JSONB NOT NULL,
  "medGemmaReferences" JSONB NOT NULL,
  "clinicianActionRequired" BOOLEAN NOT NULL DEFAULT true,
  "validationStatus" "AiValidationStatus" NOT NULL DEFAULT 'valid',
  "reviewStatus" "AiReviewStatus" NOT NULL DEFAULT 'review_required',
  "version" INTEGER NOT NULL DEFAULT 1,
  "supersedesId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiArtifactRevision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SummaryRevision" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ambientSessionId" UUID NOT NULL,
  "artifactRevisionId" UUID,
  "content" TEXT NOT NULL,
  "sections" JSONB,
  "sourceReferences" JSONB NOT NULL,
  "confidence" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SummaryRevision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HighlightCard" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ambientSessionId" UUID NOT NULL,
  "artifactRevisionId" UUID,
  "type" "HighlightType" NOT NULL,
  "severity" "RuleSeverity" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "sourceReferences" JSONB NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "requiresAcknowledgement" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HighlightCard_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Suggestion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ambientSessionId" UUID NOT NULL,
  "artifactRevisionId" UUID,
  "title" TEXT NOT NULL,
  "rationale" TEXT NOT NULL,
  "priority" "SuggestionPriority" NOT NULL,
  "status" "SuggestionStatus" NOT NULL DEFAULT 'open',
  "sourceReferences" JSONB NOT NULL,
  "resultOptions" JSONB NOT NULL,
  "freeTextAllowed" BOOLEAN NOT NULL DEFAULT true,
  "clinicianActionRequired" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Suggestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SuggestionResult" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "suggestionId" UUID NOT NULL,
  "selectedOptionValue" TEXT,
  "selectedOptionLabel" TEXT,
  "freeTextNote" TEXT,
  "actorId" UUID NOT NULL,
  "contextImpact" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SuggestionResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PatientMemoryFact" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "patientId" UUID NOT NULL,
  "pregnancyEpisodeId" UUID NOT NULL,
  "content" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT,
  "provenance" JSONB NOT NULL,
  "embedding" vector,
  "status" TEXT NOT NULL DEFAULT 'approved',
  "createdById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientMemoryFact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SynthesisTick" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ambientSessionId" UUID NOT NULL,
  "contextSnapshotId" UUID,
  "requestedById" UUID,
  "status" "SynthesisTickStatus" NOT NULL DEFAULT 'pending',
  "triggerReason" TEXT NOT NULL DEFAULT 'manual',
  "clientRequestId" TEXT,
  "stateVersion" INTEGER NOT NULL,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SynthesisTick_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContextSnapshot_ambientSessionId_createdAt_idx" ON "ContextSnapshot"("ambientSessionId", "createdAt");
CREATE INDEX "ContextSnapshot_patientId_pregnancyEpisodeId_idx" ON "ContextSnapshot"("patientId", "pregnancyEpisodeId");
CREATE INDEX "ContextSnapshot_encounterId_idx" ON "ContextSnapshot"("encounterId");
CREATE INDEX "AiToolCall_ambientSessionId_createdAt_idx" ON "AiToolCall"("ambientSessionId", "createdAt");
CREATE INDEX "AiToolCall_contextSnapshotId_idx" ON "AiToolCall"("contextSnapshotId");
CREATE INDEX "AiToolCall_status_idx" ON "AiToolCall"("status");
CREATE INDEX "AiArtifactRevision_ambientSessionId_artifactType_createdAt_idx" ON "AiArtifactRevision"("ambientSessionId", "artifactType", "createdAt");
CREATE INDEX "AiArtifactRevision_contextSnapshotId_idx" ON "AiArtifactRevision"("contextSnapshotId");
CREATE INDEX "AiArtifactRevision_validationStatus_reviewStatus_idx" ON "AiArtifactRevision"("validationStatus", "reviewStatus");
CREATE INDEX "SummaryRevision_ambientSessionId_createdAt_idx" ON "SummaryRevision"("ambientSessionId", "createdAt");
CREATE INDEX "HighlightCard_ambientSessionId_status_idx" ON "HighlightCard"("ambientSessionId", "status");
CREATE INDEX "HighlightCard_severity_idx" ON "HighlightCard"("severity");
CREATE INDEX "Suggestion_ambientSessionId_status_idx" ON "Suggestion"("ambientSessionId", "status");
CREATE INDEX "Suggestion_priority_idx" ON "Suggestion"("priority");
CREATE INDEX "SuggestionResult_suggestionId_createdAt_idx" ON "SuggestionResult"("suggestionId", "createdAt");
CREATE INDEX "PatientMemoryFact_patientId_pregnancyEpisodeId_status_idx" ON "PatientMemoryFact"("patientId", "pregnancyEpisodeId", "status");
CREATE INDEX "SynthesisTick_ambientSessionId_stateVersion_status_idx" ON "SynthesisTick"("ambientSessionId", "stateVersion", "status");
CREATE INDEX "SynthesisTick_clientRequestId_idx" ON "SynthesisTick"("clientRequestId");

ALTER TABLE "ContextSnapshot" ADD CONSTRAINT "ContextSnapshot_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContextSnapshot" ADD CONSTRAINT "ContextSnapshot_pregnancyEpisodeId_fkey" FOREIGN KEY ("pregnancyEpisodeId") REFERENCES "PregnancyEpisode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContextSnapshot" ADD CONSTRAINT "ContextSnapshot_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContextSnapshot" ADD CONSTRAINT "ContextSnapshot_ambientSessionId_fkey" FOREIGN KEY ("ambientSessionId") REFERENCES "AmbientSessionState"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContextSnapshot" ADD CONSTRAINT "ContextSnapshot_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiToolCall" ADD CONSTRAINT "AiToolCall_ambientSessionId_fkey" FOREIGN KEY ("ambientSessionId") REFERENCES "AmbientSessionState"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiToolCall" ADD CONSTRAINT "AiToolCall_contextSnapshotId_fkey" FOREIGN KEY ("contextSnapshotId") REFERENCES "ContextSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiArtifactRevision" ADD CONSTRAINT "AiArtifactRevision_ambientSessionId_fkey" FOREIGN KEY ("ambientSessionId") REFERENCES "AmbientSessionState"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiArtifactRevision" ADD CONSTRAINT "AiArtifactRevision_contextSnapshotId_fkey" FOREIGN KEY ("contextSnapshotId") REFERENCES "ContextSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiArtifactRevision" ADD CONSTRAINT "AiArtifactRevision_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "AiArtifactRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SummaryRevision" ADD CONSTRAINT "SummaryRevision_ambientSessionId_fkey" FOREIGN KEY ("ambientSessionId") REFERENCES "AmbientSessionState"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SummaryRevision" ADD CONSTRAINT "SummaryRevision_artifactRevisionId_fkey" FOREIGN KEY ("artifactRevisionId") REFERENCES "AiArtifactRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HighlightCard" ADD CONSTRAINT "HighlightCard_ambientSessionId_fkey" FOREIGN KEY ("ambientSessionId") REFERENCES "AmbientSessionState"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HighlightCard" ADD CONSTRAINT "HighlightCard_artifactRevisionId_fkey" FOREIGN KEY ("artifactRevisionId") REFERENCES "AiArtifactRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_ambientSessionId_fkey" FOREIGN KEY ("ambientSessionId") REFERENCES "AmbientSessionState"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_artifactRevisionId_fkey" FOREIGN KEY ("artifactRevisionId") REFERENCES "AiArtifactRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SuggestionResult" ADD CONSTRAINT "SuggestionResult_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "Suggestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SuggestionResult" ADD CONSTRAINT "SuggestionResult_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientMemoryFact" ADD CONSTRAINT "PatientMemoryFact_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientMemoryFact" ADD CONSTRAINT "PatientMemoryFact_pregnancyEpisodeId_fkey" FOREIGN KEY ("pregnancyEpisodeId") REFERENCES "PregnancyEpisode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientMemoryFact" ADD CONSTRAINT "PatientMemoryFact_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SynthesisTick" ADD CONSTRAINT "SynthesisTick_ambientSessionId_fkey" FOREIGN KEY ("ambientSessionId") REFERENCES "AmbientSessionState"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SynthesisTick" ADD CONSTRAINT "SynthesisTick_contextSnapshotId_fkey" FOREIGN KEY ("contextSnapshotId") REFERENCES "ContextSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SynthesisTick" ADD CONSTRAINT "SynthesisTick_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
