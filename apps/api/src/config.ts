import { z } from 'zod';

const configSchema = z.object({
  appEnv: z.enum(['development', 'test', 'production']).default('development'),
  port: z.coerce.number().int().positive().default(4000),
  databaseUrl: z.string().optional(),
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return configSchema.parse({
    appEnv: env.APP_ENV,
    port: env.PORT,
    databaseUrl: env.DATABASE_URL,
  });
}
