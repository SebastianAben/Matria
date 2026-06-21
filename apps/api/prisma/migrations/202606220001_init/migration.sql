CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE "UserStatus" AS ENUM ('active', 'disabled');
CREATE TYPE "AuditOutcome" AS ENUM ('success', 'failure', 'denied');
CREATE TYPE "EncounterStatus" AS ENUM ('draft', 'active', 'reviewing', 'closed', 'approved', 'archived');
CREATE TYPE "ConsentMode" AS ENUM ('audio', 'transcript', 'ai', 'media', 'fhir_export');
CREATE TYPE "ConsentStatus" AS ENUM ('granted', 'withdrawn', 'declined');
CREATE TYPE "ClinicalFileKind" AS ENUM ('audio', 'image', 'document', 'ultrasound');
CREATE TYPE "ObservationType" AS ENUM ('vitals', 'labs', 'symptoms', 'history', 'medications', 'allergies', 'gestational_age');
CREATE TYPE "ObservationVerificationStatus" AS ENUM ('unverified', 'clinician_entered', 'clinician_verified', 'corrected', 'rejected');

CREATE TABLE "User" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "status" "UserStatus" NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Role" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Role_key_key" ON "Role"("key");

CREATE TABLE "Permission" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

CREATE TABLE "UserRole" (
  "userId" UUID NOT NULL,
  "roleId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

CREATE TABLE "RolePermission" (
  "roleId" UUID NOT NULL,
  "permissionId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

CREATE TABLE "Session" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tokenHash" TEXT NOT NULL,
  "userId" UUID NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

CREATE TABLE "AuditLog" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "actorId" UUID,
  "action" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT,
  "outcome" "AuditOutcome" NOT NULL,
  "requestId" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

CREATE TABLE "Patient" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "hospitalNumber" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "dateOfBirth" TIMESTAMP(3),
  "phone" TEXT,
  "address" TEXT,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Patient_hospitalNumber_key" ON "Patient"("hospitalNumber");

CREATE TABLE "PregnancyEpisode" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "patientId" UUID NOT NULL,
  "label" TEXT NOT NULL,
  "estimatedDueDate" TIMESTAMP(3),
  "gestationalAgeWeeks" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PregnancyEpisode_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PregnancyEpisode_patientId_idx" ON "PregnancyEpisode"("patientId");

CREATE TABLE "Encounter" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "patientId" UUID NOT NULL,
  "pregnancyEpisodeId" UUID NOT NULL,
  "status" "EncounterStatus" NOT NULL DEFAULT 'draft',
  "visitType" TEXT NOT NULL DEFAULT 'routine_anc',
  "facilityName" TEXT,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Encounter_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Encounter_patientId_idx" ON "Encounter"("patientId");
CREATE INDEX "Encounter_pregnancyEpisodeId_idx" ON "Encounter"("pregnancyEpisodeId");

CREATE TABLE "ConsentRecord" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "encounterId" UUID NOT NULL,
  "mode" "ConsentMode" NOT NULL,
  "status" "ConsentStatus" NOT NULL,
  "note" TEXT,
  "actorId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ConsentRecord_encounterId_mode_idx" ON "ConsentRecord"("encounterId", "mode");

CREATE TABLE "ClinicalFile" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "encounterId" UUID NOT NULL,
  "kind" "ClinicalFileKind" NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "storageUri" TEXT,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClinicalFile_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ClinicalFile_encounterId_idx" ON "ClinicalFile"("encounterId");

CREATE TABLE "StructuredObservation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "encounterId" UUID NOT NULL,
  "type" "ObservationType" NOT NULL,
  "value" JSONB NOT NULL,
  "verificationStatus" "ObservationVerificationStatus" NOT NULL DEFAULT 'clinician_entered',
  "source" TEXT NOT NULL DEFAULT 'manual_entry',
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StructuredObservation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StructuredObservation_encounterId_type_idx" ON "StructuredObservation"("encounterId", "type");

CREATE TABLE "SessionNote" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "encounterId" UUID NOT NULL,
  "content" TEXT NOT NULL DEFAULT '',
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SessionNote_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SessionNote_encounterId_key" ON "SessionNote"("encounterId");

ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PregnancyEpisode" ADD CONSTRAINT "PregnancyEpisode_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_pregnancyEpisodeId_fkey" FOREIGN KEY ("pregnancyEpisodeId") REFERENCES "PregnancyEpisode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClinicalFile" ADD CONSTRAINT "ClinicalFile_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StructuredObservation" ADD CONSTRAINT "StructuredObservation_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StructuredObservation" ADD CONSTRAINT "StructuredObservation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SessionNote" ADD CONSTRAINT "SessionNote_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SessionNote" ADD CONSTRAINT "SessionNote_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

