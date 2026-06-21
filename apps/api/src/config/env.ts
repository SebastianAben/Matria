import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  DATABASE_URL: z
    .string()
    .url()
    .default("postgresql://matria:matria@localhost:54329/matria?schema=public"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  SESSION_COOKIE_NAME: z.string().min(1).default("matria_session"),
  SESSION_SECRET: z.string().min(12).default("local-development-secret"),
  ADMIN_EMAIL: z.string().email().default("admin@matriacare.site"),
  ADMIN_PASSWORD: z.string().min(8).default("change-me-in-local-dev"),
  GEMINI_PROVIDER: z.string().default("vertex_ai"),
  GEMINI_PRIMARY_MODEL: z.string().default("gemini-3.1-pro-preview"),
  GEMINI_DIARIZATION_MODEL: z.string().default("gemini-flash-lite-latest"),
  GOOGLE_CLOUD_PROJECT: z.string().optional(),
  GOOGLE_CLOUD_LOCATION: z.string().default("global")
});

export const env = envSchema.parse(process.env);
