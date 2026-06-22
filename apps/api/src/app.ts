import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { adminRouter } from "./admin/routes.js";
import { aiRouter } from "./ai/routes.js";
import { ambientRouter } from "./ambient/routes.js";
import { auditRouter } from "./audit/routes.js";
import { authRouter } from "./auth/routes.js";
import { optionalAuth } from "./auth/middleware.js";
import { env } from "./config/env.js";
import { prisma } from "./db/prisma.js";
import { evidenceRouter } from "./evidence/routes.js";
import { clinicalRouter } from "./clinical/routes.js";
import { outputsRouter } from "./outputs/routes.js";
import { requestContext } from "./http/request-context.js";
import { errorHandler, notFoundHandler, sendOk } from "./http/responses.js";
import { rulesRouter } from "./rules/routes.js";

export function createApp() {
  const app = express();

  app.use(requestContext);
  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(optionalAuth);

  app.get("/health", (req, res) => {
    return sendOk(req, res, { status: "ok", service: "matria-api" });
  });

  app.get("/ready", async (req, res, next) => {
    try {
      const db = await prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 as ok`;
      return sendOk(req, res, {
        status: "ready",
        checks: {
          app: "ok",
          database: db[0]?.ok === 1 ? "ok" : "unknown",
          geminiProvider: env.GEMINI_PROVIDER,
          medicalEvidenceProvider: env.MEDICAL_EVIDENCE_PROVIDER,
          medicalEvidenceModel: env.MEDICAL_EVIDENCE_MODEL,
          clinicalFileStorageProvider: env.CLINICAL_FILE_STORAGE_PROVIDER,
          googleCloudLocation: env.GOOGLE_CLOUD_LOCATION,
          sttProvider: env.STT_PROVIDER
        }
      });
    } catch (error) {
      return next(error);
    }
  });

  app.use("/auth", authRouter);
  app.use("/admin", adminRouter);
  app.use("/", auditRouter);
  app.use("/", clinicalRouter);
  app.use("/", rulesRouter);
  app.use("/", ambientRouter);
  app.use("/", aiRouter);
  app.use("/", evidenceRouter);
  app.use("/", outputsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
