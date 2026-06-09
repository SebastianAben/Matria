import { z } from 'zod';

export const idSchema = z.string().uuid();
export const isoDateTimeSchema = z.string().datetime();

export const permissionActionSchema = z.enum([
  'patient:read',
  'encounter:write',
  'file:upload',
  'ai:synthesis:request',
  'output:approve',
  'fhir:export',
  'user:admin',
  'audit:read',
  'system:configure',
]);

export const roleNameSchema = z.enum([
  'clinician',
  'obgyn_specialist',
  'nurse_midwife',
  'lab_staff',
  'radiology_sonographer',
  'hospital_admin',
  'auditor',
  'it_operator',
]);

export const userStatusSchema = z.enum(['active', 'disabled']);

export const permissionSchema = z.object({
  id: idSchema,
  action: permissionActionSchema,
  description: z.string().optional(),
  createdAt: isoDateTimeSchema,
});

export const roleSchema = z.object({
  id: idSchema,
  name: roleNameSchema,
  description: z.string().optional(),
  permissions: z.array(permissionActionSchema).default([]),
  createdAt: isoDateTimeSchema,
});

export const userSchema = z.object({
  id: idSchema,
  email: z.string().email(),
  displayName: z.string().min(1),
  status: userStatusSchema,
  roleNames: z.array(roleNameSchema).default([]),
  permissions: z.array(permissionActionSchema).default([]),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const patientSchema = z.object({
  id: idSchema,
  hospitalRecordNumber: z.string().min(1),
  displayName: z.string().min(1),
  dateOfBirth: z.string().date().optional(),
  createdAt: isoDateTimeSchema,
});

export const pregnancyEpisodeSchema = z.object({
  id: idSchema,
  patientId: idSchema,
  status: z.enum(['active', 'completed', 'archived']),
  estimatedDueDate: z.string().date().optional(),
  createdAt: isoDateTimeSchema,
});

export const encounterSchema = z.object({
  id: idSchema,
  patientId: idSchema,
  pregnancyEpisodeId: idSchema,
  type: z.enum(['initial_anc', 'follow_up_anc', 'urgent_review']),
  status: z.enum(['draft', 'preflight_complete', 'synthesis_draft', 'approved', 'closed']),
  startedAt: isoDateTimeSchema,
});

export const observationKindSchema = z.enum([
  'blood_pressure',
  'heart_rate',
  'temperature',
  'weight',
  'gestational_age',
  'lab_result',
  'symptom',
  'history',
]);

export const structuredObservationSchema = z.object({
  id: idSchema,
  encounterId: idSchema,
  kind: observationKindSchema,
  code: z.string().min(1).optional(),
  value: z.union([z.string(), z.number(), z.boolean()]),
  unit: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  source: z.enum(['manual', 'audio_transcript', 'document_image', 'ultrasound_media']),
  verifiedByClinician: z.boolean().default(false),
});

export const ruleResultSchema = z.object({
  id: idSchema,
  encounterId: idSchema,
  ruleId: z.string().min(1),
  severity: z.enum(['info', 'warning', 'urgent', 'critical']),
  message: z.string().min(1),
  evidence: z.array(z.string()).default([]),
  threshold: z.string().optional(),
  mustAcknowledge: z.boolean().default(false),
});

export const preflightPromptSchema = z.object({
  field: z.string().min(1),
  message: z.string().min(1),
  severity: z.enum(['required', 'recommended']),
});

export const uncertaintyAnnotationSchema = z.object({
  observationId: idSchema.optional(),
  field: z.string().min(1),
  reason: z.enum(['missing', 'low_confidence', 'unverified']),
  message: z.string().min(1),
});

export const clinicalPreflightSchema = z.object({
  encounterId: idSchema,
  readyForSynthesis: z.boolean(),
  prompts: z.array(preflightPromptSchema),
  ruleResults: z.array(ruleResultSchema),
  uncertainty: z.array(uncertaintyAnnotationSchema),
});

export const generatedOutputSchema = z.object({
  id: idSchema,
  encounterId: idSchema,
  kind: z.enum(['anc_note', 'risk_synthesis', 'missing_questions', 'referral_summary']),
  status: z.enum(['draft', 'edited', 'approved', 'rejected']),
  content: z.string(),
  preservesRuleResultIds: z.array(idSchema).default([]),
  uncertaintyNotes: z.array(z.string()).default([]),
  createdAt: isoDateTimeSchema,
});

export const patientMemoryEntrySchema = z.object({
  id: idSchema,
  patientId: idSchema,
  pregnancyEpisodeId: idSchema,
  encounterId: idSchema,
  sourceOutputId: idSchema,
  content: z.string().min(1),
  createdAt: isoDateTimeSchema,
});

export const clinicalApprovalSchema = z.object({
  id: idSchema,
  outputId: idSchema,
  approverUserId: idSchema,
  action: z.enum(['approved', 'edited', 'rejected']),
  editedContent: z.string().optional(),
  createdAt: isoDateTimeSchema,
});

export const fhirExportSchema = z.object({
  id: idSchema,
  encounterId: idSchema,
  outputId: idSchema,
  approvingClinicianUserId: idSchema,
  status: z.enum(['generated', 'downloaded', 'voided']),
  artifactJson: z.record(z.unknown()),
  generatedAt: isoDateTimeSchema,
});

export const auditLogSchema = z.object({
  id: idSchema,
  actorUserId: idSchema.optional(),
  action: z.string().min(1),
  resourceType: z.string().min(1),
  resourceId: z.string().optional(),
  patientId: idSchema.optional(),
  pregnancyEpisodeId: idSchema.optional(),
  createdAt: isoDateTimeSchema,
});

export type PermissionAction = z.infer<typeof permissionActionSchema>;
export type RoleName = z.infer<typeof roleNameSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;
export type Permission = z.infer<typeof permissionSchema>;
export type Role = z.infer<typeof roleSchema>;
export type User = z.infer<typeof userSchema>;
export type Patient = z.infer<typeof patientSchema>;
export type PregnancyEpisode = z.infer<typeof pregnancyEpisodeSchema>;
export type Encounter = z.infer<typeof encounterSchema>;
export type StructuredObservation = z.infer<typeof structuredObservationSchema>;
export type RuleResult = z.infer<typeof ruleResultSchema>;
export type PreflightPrompt = z.infer<typeof preflightPromptSchema>;
export type UncertaintyAnnotation = z.infer<typeof uncertaintyAnnotationSchema>;
export type ClinicalPreflight = z.infer<typeof clinicalPreflightSchema>;
export type GeneratedOutput = z.infer<typeof generatedOutputSchema>;
export type PatientMemoryEntry = z.infer<typeof patientMemoryEntrySchema>;
export type ClinicalApproval = z.infer<typeof clinicalApprovalSchema>;
export type FhirExport = z.infer<typeof fhirExportSchema>;
export type AuditLog = z.infer<typeof auditLogSchema>;
