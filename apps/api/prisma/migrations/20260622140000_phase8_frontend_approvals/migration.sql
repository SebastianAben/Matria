CREATE TYPE "GeneratedOutputType" AS ENUM (
  'summary',
  'note_draft',
  'risk_synthesis',
  'missing_questions',
  'referral_summary',
  'teleconsult_summary',
  'fhir_draft_input',
  'medical_evidence',
  'other'
);

CREATE TYPE "GeneratedOutputStatus" AS ENUM (
  'draft',
  'review_required',
  'approved',
  'edited',
  'rejected',
  'uncertain',
  'acknowledged',
  'stale'
);

CREATE TYPE "ClinicalApprovalAction" AS ENUM (
  'approve',
  'edit',
  'reject',
  'mark_uncertain',
  'acknowledge'
);

CREATE TABLE "GeneratedOutput" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ambientSessionId" UUID NOT NULL,
  "artifactRevisionId" UUID,
  "evidenceFindingId" UUID,
  "outputType" "GeneratedOutputType" NOT NULL,
  "title" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "status" "GeneratedOutputStatus" NOT NULL DEFAULT 'review_required',
  "sourceReferences" JSONB NOT NULL,
  "confidence" DOUBLE PRECISION,
  "uncertaintyReasons" JSONB,
  "canonicalContent" JSONB,
  "reviewedAt" TIMESTAMP(3),
  "reviewedById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "GeneratedOutput_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClinicalApproval" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "generatedOutputId" UUID NOT NULL,
  "action" "ClinicalApprovalAction" NOT NULL,
  "actorId" UUID NOT NULL,
  "note" TEXT,
  "editedContent" JSONB,
  "previousStatus" "GeneratedOutputStatus" NOT NULL,
  "nextStatus" "GeneratedOutputStatus" NOT NULL,
  "provenance" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClinicalApproval_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GeneratedOutput_artifactRevisionId_key" ON "GeneratedOutput"("artifactRevisionId");
CREATE UNIQUE INDEX "GeneratedOutput_evidenceFindingId_key" ON "GeneratedOutput"("evidenceFindingId");
CREATE INDEX "GeneratedOutput_ambientSessionId_status_idx" ON "GeneratedOutput"("ambientSessionId", "status");
CREATE INDEX "GeneratedOutput_outputType_idx" ON "GeneratedOutput"("outputType");
CREATE INDEX "ClinicalApproval_generatedOutputId_createdAt_idx" ON "ClinicalApproval"("generatedOutputId", "createdAt");
CREATE INDEX "ClinicalApproval_actorId_createdAt_idx" ON "ClinicalApproval"("actorId", "createdAt");

ALTER TABLE "GeneratedOutput"
  ADD CONSTRAINT "GeneratedOutput_ambientSessionId_fkey"
  FOREIGN KEY ("ambientSessionId") REFERENCES "AmbientSessionState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GeneratedOutput"
  ADD CONSTRAINT "GeneratedOutput_artifactRevisionId_fkey"
  FOREIGN KEY ("artifactRevisionId") REFERENCES "AiArtifactRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GeneratedOutput"
  ADD CONSTRAINT "GeneratedOutput_evidenceFindingId_fkey"
  FOREIGN KEY ("evidenceFindingId") REFERENCES "MedicalEvidenceFinding"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClinicalApproval"
  ADD CONSTRAINT "ClinicalApproval_generatedOutputId_fkey"
  FOREIGN KEY ("generatedOutputId") REFERENCES "GeneratedOutput"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClinicalApproval"
  ADD CONSTRAINT "ClinicalApproval_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
