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
    contracts: dependencyCheckSchema,
  }),
  timestamp: z.string().datetime(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type ReadinessResponse = z.infer<typeof readinessResponseSchema>;
