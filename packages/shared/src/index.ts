import { z } from "zod";

export const roleKeys = [
  "clinician",
  "obgyn_specialist",
  "nurse_midwife",
  "lab_staff",
  "radiology_sonographer",
  "hospital_admin",
  "auditor",
  "it_operator"
] as const;

export const permissionKeys = [
  "patient:read",
  "patient:write",
  "pregnancy_episode:write",
  "encounter:read",
  "encounter:write",
  "consent:write",
  "clinical_file:write",
  "observation:write",
  "session_note:write",
  "rule:evaluate",
  "rule:acknowledge",
  "ambient_session:start",
  "audio:process",
  "transcript:correct",
  "ai:synthesis",
  "suggestion:resolve",
  "output:approve",
  "fhir:export",
  "admin:users",
  "admin:roles",
  "audit:read",
  "system:config"
] as const;

export const encounterStatuses = [
  "draft",
  "active",
  "reviewing",
  "closed",
  "approved",
  "archived"
] as const;

export const consentModes = ["audio", "transcript", "ai", "media", "fhir_export"] as const;
export const consentStatuses = ["granted", "withdrawn", "declined"] as const;

export const observationTypes = [
  "vitals",
  "labs",
  "symptoms",
  "history",
  "medications",
  "allergies",
  "gestational_age"
] as const;

export const observationVerificationStatuses = [
  "unverified",
  "clinician_entered",
  "clinician_verified",
  "corrected",
  "rejected"
] as const;

export const clinicalFileKinds = ["audio", "image", "document", "ultrasound"] as const;

export const ruleSeverities = ["info", "watch", "warning", "critical"] as const;
export const ruleBlockingLevels = ["none", "soft", "ack_required", "hard"] as const;
export const ruleResultStatuses = [
  "active",
  "acknowledged",
  "resolved",
  "overridden",
  "superseded"
] as const;
export const ruleActionTypes = [
  "suggestion",
  "missing_question",
  "acknowledge",
  "review",
  "escalation_review"
] as const;

export const ambientSessionStatuses = [
  "initialized",
  "consent_pending",
  "listening",
  "transcribing",
  "diarizing",
  "normalizing",
  "closed",
  "failed"
] as const;
export const transcriptCorrectionStatuses = [
  "raw",
  "auto_diarized",
  "clinician_corrected",
  "system_revised"
] as const;
export const speakerRoleGuesses = ["clinician", "patient", "companion", "unknown"] as const;
export const transcriptClinicalCandidateTypes = [
  "symptom_mention",
  "danger_sign_mention",
  "medication_mention",
  "history_mention",
  "gestational_age_mention",
  "clinician_plan",
  "unresolved_question"
] as const;

export const errorCodes = [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "VALIDATION_FAILED",
  "NOT_FOUND",
  "CONFLICT",
  "INVALID_STATE_TRANSITION",
  "CONSENT_REQUIRED",
  "SCOPE_MISMATCH",
  "INTERNAL_ERROR"
] as const;

export type RoleKey = (typeof roleKeys)[number];
export type PermissionKey = (typeof permissionKeys)[number];
export type EncounterStatus = (typeof encounterStatuses)[number];
export type ConsentMode = (typeof consentModes)[number];
export type ConsentStatus = (typeof consentStatuses)[number];
export type ObservationType = (typeof observationTypes)[number];
export type ObservationVerificationStatus = (typeof observationVerificationStatuses)[number];
export type ClinicalFileKind = (typeof clinicalFileKinds)[number];
export type RuleSeverity = (typeof ruleSeverities)[number];
export type RuleBlockingLevel = (typeof ruleBlockingLevels)[number];
export type RuleResultStatus = (typeof ruleResultStatuses)[number];
export type RuleActionType = (typeof ruleActionTypes)[number];
export type AmbientSessionStatus = (typeof ambientSessionStatuses)[number];
export type TranscriptCorrectionStatus = (typeof transcriptCorrectionStatuses)[number];
export type SpeakerRoleGuess = (typeof speakerRoleGuesses)[number];
export type TranscriptClinicalCandidateType = (typeof transcriptClinicalCandidateTypes)[number];
export type ErrorCode = (typeof errorCodes)[number];

export type ApiSuccess<T> = {
  success: true;
  data: T;
  requestId: string;
};

export type ApiFailure = {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
  requestId: string;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export const patientCreateSchema = z.object({
  hospitalNumber: z.string().min(1).max(80),
  fullName: z.string().min(1).max(200),
  dateOfBirth: z.string().date().optional(),
  phone: z.string().max(80).optional(),
  address: z.string().max(500).optional()
});

export const pregnancyEpisodeCreateSchema = z.object({
  label: z.string().min(1).max(120),
  estimatedDueDate: z.string().date().optional(),
  gestationalAgeWeeks: z.number().int().min(0).max(45).optional(),
  status: z.enum(["active", "historical"]).default("active")
});

export const encounterCreateSchema = z.object({
  patientId: z.string().uuid(),
  pregnancyEpisodeId: z.string().uuid(),
  visitType: z.string().min(1).max(120).default("routine_anc"),
  facilityName: z.string().min(1).max(160).optional()
});

export const consentCreateSchema = z.object({
  mode: z.enum(consentModes),
  status: z.enum(consentStatuses),
  note: z.string().max(500).optional()
});

export const clinicalFileCreateSchema = z.object({
  kind: z.enum(clinicalFileKinds),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(120),
  sizeBytes: z.number().int().nonnegative(),
  storageUri: z.string().max(500).optional()
});

export const observationCreateSchema = z.object({
  type: z.enum(observationTypes),
  value: z.record(z.string(), z.unknown()),
  verificationStatus: z.enum(observationVerificationStatuses).default("clinician_entered"),
  source: z.string().max(120).default("manual_entry")
});

export const sessionNoteUpdateSchema = z.object({
  content: z.string().max(20000)
});

export const encounterTransitionSchema = z.object({
  status: z.enum(encounterStatuses)
});

export const sourceReferenceSchema = z.object({
  type: z.string().min(1).max(80),
  id: z.string().max(120).optional(),
  label: z.string().max(240).optional()
});

export const ruleResultPatchSchema = z.object({
  status: z.enum(["acknowledged", "resolved", "overridden"]),
  acknowledgementNote: z.string().max(1000).optional()
});

export const persistedRuleResultSchema = z.object({
  ruleId: z.string().min(1).max(120),
  ruleVersion: z.string().min(1).max(40),
  severity: z.enum(ruleSeverities),
  blockingLevel: z.enum(ruleBlockingLevels),
  actionType: z.enum(ruleActionTypes),
  evidence: z.record(z.string(), z.unknown()),
  sourceReferences: z.array(sourceReferenceSchema),
  confidence: z.number().min(0).max(1),
  suggestedAction: z.string().min(1).max(1000),
  needsLocalGuidelineValidation: z.boolean().default(false)
});

export const ambientSessionCreateSchema = z.object({});

export const audioEventCreateSchema = z.object({
  sequence: z.number().int().nonnegative(),
  mimeType: z.string().min(1).max(120).default("audio/wav"),
  durationMs: z.number().int().nonnegative().optional(),
  byteLength: z.number().int().nonnegative().optional(),
  storageUri: z.string().max(500).optional(),
  transcriptText: z.string().max(10000).optional(),
  simulateFailure: z.boolean().optional()
});

export const transcriptTurnCreateSchema = z.object({
  sourceAudioSegmentId: z.string().uuid().optional(),
  speakerLabel: z.string().min(1).max(80).default("Speaker 1"),
  speakerRoleGuess: z.enum(speakerRoleGuesses).default("unknown"),
  roleConfidence: z.number().min(0).max(1).optional(),
  startTimeMs: z.number().int().nonnegative().default(0),
  endTimeMs: z.number().int().nonnegative().default(0),
  text: z.string().min(1).max(10000),
  languageCode: z.string().min(2).max(20).default("en-US"),
  sttConfidence: z.number().min(0).max(1).optional(),
  diarizationConfidence: z.number().min(0).max(1).optional()
});

export const transcriptTurnPatchSchema = z.object({
  speakerLabel: z.string().min(1).max(80).optional(),
  speakerRoleGuess: z.enum(speakerRoleGuesses).optional(),
  text: z.string().min(1).max(10000).optional()
});

export function ok<T>(data: T, requestId: string): ApiSuccess<T> {
  return { success: true, data, requestId };
}

export function fail(
  code: ErrorCode,
  message: string,
  requestId: string,
  details?: unknown
): ApiFailure {
  return { success: false, error: { code, message, details }, requestId };
}
