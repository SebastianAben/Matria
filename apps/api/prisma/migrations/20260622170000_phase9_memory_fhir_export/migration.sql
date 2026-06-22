CREATE TYPE "FhirExportKind" AS ENUM ('referral', 'teleconsult');

CREATE TYPE "FhirExportStatus" AS ENUM ('generated', 'failed');

ALTER TABLE "PatientMemoryFact" ADD COLUMN "dedupeKey" TEXT;

UPDATE "PatientMemoryFact"
SET "dedupeKey" = md5(lower(regexp_replace(trim("content"), '\s+', ' ', 'g')))
WHERE "dedupeKey" IS NULL;

ALTER TABLE "PatientMemoryFact" ALTER COLUMN "dedupeKey" SET NOT NULL;

CREATE UNIQUE INDEX "PatientMemoryFact_patientId_pregnancyEpisodeId_dedupeKey_key"
ON "PatientMemoryFact"("patientId", "pregnancyEpisodeId", "dedupeKey");

CREATE TABLE "FhirExport" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "encounterId" UUID NOT NULL,
  "sourceOutputId" UUID NOT NULL,
  "exportKind" "FhirExportKind" NOT NULL,
  "status" "FhirExportStatus" NOT NULL DEFAULT 'generated',
  "destinationLabel" TEXT,
  "note" TEXT,
  "fhirBundle" JSONB NOT NULL,
  "sourceManifest" JSONB NOT NULL,
  "provenance" JSONB NOT NULL,
  "generatedById" UUID NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FhirExport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FhirExport_encounterId_generatedAt_idx" ON "FhirExport"("encounterId", "generatedAt");
CREATE INDEX "FhirExport_sourceOutputId_idx" ON "FhirExport"("sourceOutputId");
CREATE INDEX "FhirExport_exportKind_status_idx" ON "FhirExport"("exportKind", "status");

ALTER TABLE "FhirExport"
ADD CONSTRAINT "FhirExport_encounterId_fkey"
FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FhirExport"
ADD CONSTRAINT "FhirExport_sourceOutputId_fkey"
FOREIGN KEY ("sourceOutputId") REFERENCES "GeneratedOutput"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FhirExport"
ADD CONSTRAINT "FhirExport_generatedById_fkey"
FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
