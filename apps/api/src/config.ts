import { z } from 'zod';

const configSchema = z.object({
  appEnv: z.enum(['development', 'test', 'production']).default('development'),
  port: z.coerce.number().int().positive().default(4000),
  databaseUrl: z.string().optional(),
  sessionSecret: z.string().min(32).optional(),
  adminBootstrapEmail: z.string().email().optional(),
  adminBootstrapPassword: z.string().min(12).optional(),
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return configSchema.parse({
    appEnv: env.APP_ENV,
    port: env.PORT,
    databaseUrl: env.DATABASE_URL,
    sessionSecret: env.SESSION_SECRET,
    adminBootstrapEmail: env.ADMIN_BOOTSTRAP_EMAIL,
    adminBootstrapPassword: env.ADMIN_BOOTSTRAP_PASSWORD,
  });
}
