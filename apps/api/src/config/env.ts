import "dotenv/config";
import { z } from "zod";

export const envSchema = z
  .object({
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
    GEMINI_PROVIDER: z.enum(["mock", "vertex_ai"]).default("mock"),
    GEMINI_PRIMARY_MODEL: z.string().default("gemini-3.1-pro-preview"),
    GEMINI_DIARIZATION_MODEL: z.string().default("gemini-flash-lite-latest"),
    GOOGLE_CLOUD_PROJECT: z.string().optional(),
    GOOGLE_CLOUD_LOCATION: z.string().default("global"),
    GOOGLE_GENAI_USE_ENTERPRISE: z.string().default("True"),
    STT_PROVIDER: z.enum(["mock", "google"]).default("mock"),
    GOOGLE_STT_LANGUAGE_CODE: z.string().default("en-US"),
    GOOGLE_STT_MODEL: z.string().default("latest_long"),
    GOOGLE_STT_ENABLE_DIARIZATION: z.coerce.boolean().default(true),
    GOOGLE_STT_SPEAKER_COUNT: z.coerce.number().int().positive().default(2)
  })
  .superRefine((value, context) => {
    if (value.GEMINI_PROVIDER === "vertex_ai" && !value.GOOGLE_CLOUD_PROJECT) {
      context.addIssue({
        code: "custom",
        path: ["GOOGLE_CLOUD_PROJECT"],
        message: "GOOGLE_CLOUD_PROJECT is required when GEMINI_PROVIDER=vertex_ai."
      });
    }
  });

export const env = envSchema.parse(process.env);
