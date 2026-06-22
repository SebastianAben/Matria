ALTER TABLE "ClinicalFile"
ADD COLUMN "storageProvider" TEXT NOT NULL DEFAULT 'local',
ADD COLUMN "storageKey" TEXT,
ADD COLUMN "checksumSha256" TEXT,
ADD COLUMN "metadata" JSONB;

CREATE INDEX "ClinicalFile_storageKey_idx" ON "ClinicalFile"("storageKey");
CREATE INDEX "ClinicalFile_checksumSha256_idx" ON "ClinicalFile"("checksumSha256");

CREATE TABLE "MedicalEvidenceFrameSample" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ambientSessionId" UUID,
  "clinicalFileId" UUID NOT NULL,
  "sourceTimestampMs" INTEGER,
  "frameIndex" INTEGER NOT NULL DEFAULT 0,
  "storageProvider" TEXT NOT NULL DEFAULT 'local',
  "storageKey" TEXT,
  "storageUri" TEXT,
  "checksumSha256" TEXT,
  "mimeType" TEXT NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "qualityMetadata" JSONB,
  "processingStatus" TEXT NOT NULL DEFAULT 'sampled',
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicalEvidenceFrameSample_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MedicalEvidenceHandoff" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ambientSessionId" UUID NOT NULL,
  "contextSnapshotId" UUID,
  "requestingArtifactId" UUID,
  "taskType" TEXT NOT NULL,
  "exactQuestion" TEXT NOT NULL,
  "clinicalContext" JSONB NOT NULL,
  "expectedOutputSchema" JSONB,
  "safetyInstructions" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'mock',
  "model" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "failureReason" TEXT,
  "requestedById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "MedicalEvidenceHandoff_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MedicalEvidenceHandoffFile" (
  "handoffId" UUID NOT NULL,
  "clinicalFileId" UUID NOT NULL,
  CONSTRAINT "MedicalEvidenceHandoffFile_pkey" PRIMARY KEY ("handoffId", "clinicalFileId")
);

CREATE TABLE "MedicalEvidenceHandoffFrameSample" (
  "handoffId" UUID NOT NULL,
  "frameSampleId" UUID NOT NULL,
  CONSTRAINT "MedicalEvidenceHandoffFrameSample_pkey" PRIMARY KEY ("handoffId", "frameSampleId")
);

CREATE TABLE "MedicalEvidenceFinding" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ambientSessionId" UUID NOT NULL,
  "handoffId" UUID,
  "clinicalFileId" UUID,
  "frameSampleId" UUID,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "taskType" TEXT NOT NULL,
  "findings" JSONB NOT NULL,
  "extractedValues" JSONB NOT NULL,
  "frameReferences" JSONB NOT NULL,
  "sourceEvidence" JSONB NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "uncertaintyReasons" JSONB NOT NULL,
  "qualityLimitations" JSONB NOT NULL,
  "clinicianReviewRequired" BOOLEAN NOT NULL DEFAULT true,
  "reviewStatus" TEXT NOT NULL DEFAULT 'review_required',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicalEvidenceFinding_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MedicalEvidenceFrameSample_clinicalFileId_createdAt_idx" ON "MedicalEvidenceFrameSample"("clinicalFileId", "createdAt");
CREATE INDEX "MedicalEvidenceFrameSample_ambientSessionId_createdAt_idx" ON "MedicalEvidenceFrameSample"("ambientSessionId", "createdAt");
CREATE UNIQUE INDEX "MedicalEvidenceFrameSample_clinicalFileId_frameIndex_sourceTimestampMs_key" ON "MedicalEvidenceFrameSample"("clinicalFileId", "frameIndex", "sourceTimestampMs");
CREATE INDEX "MedicalEvidenceHandoff_ambientSessionId_status_idx" ON "MedicalEvidenceHandoff"("ambientSessionId", "status");
CREATE INDEX "MedicalEvidenceHandoff_contextSnapshotId_idx" ON "MedicalEvidenceHandoff"("contextSnapshotId");
CREATE INDEX "MedicalEvidenceFinding_ambientSessionId_createdAt_idx" ON "MedicalEvidenceFinding"("ambientSessionId", "createdAt");
CREATE INDEX "MedicalEvidenceFinding_handoffId_idx" ON "MedicalEvidenceFinding"("handoffId");
CREATE INDEX "MedicalEvidenceFinding_clinicalFileId_idx" ON "MedicalEvidenceFinding"("clinicalFileId");

ALTER TABLE "MedicalEvidenceFrameSample" ADD CONSTRAINT "MedicalEvidenceFrameSample_ambientSessionId_fkey" FOREIGN KEY ("ambientSessionId") REFERENCES "AmbientSessionState"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MedicalEvidenceFrameSample" ADD CONSTRAINT "MedicalEvidenceFrameSample_clinicalFileId_fkey" FOREIGN KEY ("clinicalFileId") REFERENCES "ClinicalFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicalEvidenceHandoff" ADD CONSTRAINT "MedicalEvidenceHandoff_ambientSessionId_fkey" FOREIGN KEY ("ambientSessionId") REFERENCES "AmbientSessionState"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicalEvidenceHandoff" ADD CONSTRAINT "MedicalEvidenceHandoff_contextSnapshotId_fkey" FOREIGN KEY ("contextSnapshotId") REFERENCES "ContextSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MedicalEvidenceHandoff" ADD CONSTRAINT "MedicalEvidenceHandoff_requestingArtifactId_fkey" FOREIGN KEY ("requestingArtifactId") REFERENCES "AiArtifactRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MedicalEvidenceHandoff" ADD CONSTRAINT "MedicalEvidenceHandoff_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MedicalEvidenceHandoffFile" ADD CONSTRAINT "MedicalEvidenceHandoffFile_handoffId_fkey" FOREIGN KEY ("handoffId") REFERENCES "MedicalEvidenceHandoff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicalEvidenceHandoffFile" ADD CONSTRAINT "MedicalEvidenceHandoffFile_clinicalFileId_fkey" FOREIGN KEY ("clinicalFileId") REFERENCES "ClinicalFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicalEvidenceHandoffFrameSample" ADD CONSTRAINT "MedicalEvidenceHandoffFrameSample_handoffId_fkey" FOREIGN KEY ("handoffId") REFERENCES "MedicalEvidenceHandoff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicalEvidenceHandoffFrameSample" ADD CONSTRAINT "MedicalEvidenceHandoffFrameSample_frameSampleId_fkey" FOREIGN KEY ("frameSampleId") REFERENCES "MedicalEvidenceFrameSample"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicalEvidenceFinding" ADD CONSTRAINT "MedicalEvidenceFinding_ambientSessionId_fkey" FOREIGN KEY ("ambientSessionId") REFERENCES "AmbientSessionState"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicalEvidenceFinding" ADD CONSTRAINT "MedicalEvidenceFinding_handoffId_fkey" FOREIGN KEY ("handoffId") REFERENCES "MedicalEvidenceHandoff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MedicalEvidenceFinding" ADD CONSTRAINT "MedicalEvidenceFinding_clinicalFileId_fkey" FOREIGN KEY ("clinicalFileId") REFERENCES "ClinicalFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MedicalEvidenceFinding" ADD CONSTRAINT "MedicalEvidenceFinding_frameSampleId_fkey" FOREIGN KEY ("frameSampleId") REFERENCES "MedicalEvidenceFrameSample"("id") ON DELETE SET NULL ON UPDATE CASCADE;
