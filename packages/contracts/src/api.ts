import { z } from 'zod';

import {
  auditLogSchema,
  clinicalPreflightSchema,
  encounterSchema,
  generatedOutputSchema,
  fhirExportSchema,
  patientMemoryEntrySchema,
  patientSchema,
  permissionActionSchema,
  permissionSchema,
  pregnancyEpisodeSchema,
  roleNameSchema,
  roleSchema,
  structuredObservationSchema,
  userSchema,
  userStatusSchema,
} from './domain.js';

export const apiErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.unknown().optional(),
});

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('matria-api'),
  timestamp: z.string().datetime(),
});

export const dependencyCheckSchema = z.enum(['pass', 'warn', 'fail']);

export const readinessResponseSchema = z.object({
  status: z.enum(['ready', 'degraded']),
  checks: z.object({
    database: dependencyCheckSchema,
    migrations: dependencyCheckSchema,
    pgvector: dependencyCheckSchema,
    contracts: dependencyCheckSchema,
  }),
  timestamp: z.string().datetime(),
});

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const sessionUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().min(1),
  permissions: z.array(permissionActionSchema),
});

export const sessionResponseSchema = z.object({
  authenticated: z.boolean(),
  user: sessionUserSchema.optional(),
});

export const createPatientRequestSchema = patientSchema.pick({
  hospitalRecordNumber: true,
  displayName: true,
  dateOfBirth: true,
});

export const createPregnancyEpisodeRequestSchema = pregnancyEpisodeSchema.pick({
  estimatedDueDate: true,
});

export const createEncounterRequestSchema = encounterSchema.pick({
  patientId: true,
  pregnancyEpisodeId: true,
  type: true,
});

export const createStructuredObservationRequestSchema = structuredObservationSchema.pick({
  kind: true,
  code: true,
  value: true,
  unit: true,
  confidence: true,
  source: true,
  verifiedByClinician: true,
});

export const requestSynthesisRequestSchema = z.object({
  kinds: z
    .array(z.enum(['anc_note', 'risk_synthesis', 'missing_questions', 'referral_summary']))
    .min(1)
    .default(['anc_note', 'risk_synthesis', 'missing_questions', 'referral_summary']),
});

export const editGeneratedOutputRequestSchema = z.object({
  content: z.string().min(1),
});

export const reviewGeneratedOutputRequestSchema = z.object({
  editedContent: z.string().min(1).optional(),
});

export const createUserRequestSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1),
  password: z.string().min(12),
  status: userStatusSchema.default('active'),
});

export const updateUserRequestSchema = z.object({
  displayName: z.string().min(1).optional(),
  status: userStatusSchema.optional(),
});

export const assignUserRolesRequestSchema = z.object({
  roleNames: z.array(roleNameSchema).default([]),
});

export const createRoleRequestSchema = z.object({
  name: roleNameSchema,
  description: z.string().optional(),
});

export const assignRolePermissionsRequestSchema = z.object({
  permissions: z.array(permissionActionSchema).default([]),
});

export const patientResponseSchema = z.object({ data: patientSchema });
export const pregnancyEpisodeResponseSchema = z.object({ data: pregnancyEpisodeSchema });
export const encounterResponseSchema = z.object({ data: encounterSchema });
export const structuredObservationResponseSchema = z.object({ data: structuredObservationSchema });
export const structuredObservationListResponseSchema = z.object({
  data: z.array(structuredObservationSchema),
});
export const clinicalPreflightResponseSchema = z.object({ data: clinicalPreflightSchema });
export const generatedOutputResponseSchema = z.object({ data: generatedOutputSchema });
export const generatedOutputListResponseSchema = z.object({ data: z.array(generatedOutputSchema) });
export const patientMemoryListResponseSchema = z.object({
  data: z.array(patientMemoryEntrySchema),
});
export const fhirExportResponseSchema = z.object({ data: fhirExportSchema });
export const userResponseSchema = z.object({ data: userSchema });
export const userListResponseSchema = z.object({ data: z.array(userSchema) });
export const roleResponseSchema = z.object({ data: roleSchema });
export const roleListResponseSchema = z.object({ data: z.array(roleSchema) });
export const permissionListResponseSchema = z.object({ data: z.array(permissionSchema) });
export const auditLogListResponseSchema = z.object({ data: z.array(auditLogSchema) });

export type ApiError = z.infer<typeof apiErrorSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type ReadinessResponse = z.infer<typeof readinessResponseSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type SessionUser = z.infer<typeof sessionUserSchema>;
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
export type CreatePatientRequest = z.infer<typeof createPatientRequestSchema>;
export type CreatePregnancyEpisodeRequest = z.infer<typeof createPregnancyEpisodeRequestSchema>;
export type CreateEncounterRequest = z.infer<typeof createEncounterRequestSchema>;
export type CreateStructuredObservationRequest = z.infer<
  typeof createStructuredObservationRequestSchema
>;
export type RequestSynthesisRequest = z.infer<typeof requestSynthesisRequestSchema>;
export type EditGeneratedOutputRequest = z.infer<typeof editGeneratedOutputRequestSchema>;
export type ReviewGeneratedOutputRequest = z.infer<typeof reviewGeneratedOutputRequestSchema>;
export type FhirExportResponse = z.infer<typeof fhirExportResponseSchema>;
export type CreateUserRequest = z.infer<typeof createUserRequestSchema>;
export type UpdateUserRequest = z.infer<typeof updateUserRequestSchema>;
export type AssignUserRolesRequest = z.infer<typeof assignUserRolesRequestSchema>;
export type CreateRoleRequest = z.infer<typeof createRoleRequestSchema>;
export type AssignRolePermissionsRequest = z.infer<typeof assignRolePermissionsRequestSchema>;
