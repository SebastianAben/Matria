import { z } from 'zod';

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
  permissions: z.array(z.string().min(1)),
});

export const sessionResponseSchema = z.object({
  authenticated: z.boolean(),
  user: sessionUserSchema.optional(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type ReadinessResponse = z.infer<typeof readinessResponseSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type SessionUser = z.infer<typeof sessionUserSchema>;
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
