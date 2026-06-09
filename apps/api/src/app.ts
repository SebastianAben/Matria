import {
  healthResponseSchema,
  readinessResponseSchema,
  type HealthResponse,
} from '@matria/contracts';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import {
  createGeminiSynthesisProvider,
  createMedGemmaEvidenceToolAdapter,
  type EvidenceToolAdapter,
  type SynthesisProvider,
} from './ai/ai-provider.js';
import { createAiRouter } from './ai/ai-routes.js';
import {
  createInMemoryMemoryStore,
  createInMemoryOutputStore,
  type MemoryStore,
  type OutputStore,
} from './ai/output-store.js';
import type { AuditWriter } from './audit/audit-log.js';
import { createInMemoryAuditWriter } from './audit/audit-log.js';
import { createAuthRouter } from './auth/auth-routes.js';
import { requirePermission } from './auth/rbac.js';
import { sessionMiddleware } from './auth/session-middleware.js';
import { createInMemorySessionStore, type SessionStore } from './auth/session-store.js';
import { createClinicalRouter } from './clinical/clinical-routes.js';
import { createInMemoryClinicalStore, type ClinicalStore } from './clinical/clinical-store.js';
import type { AppConfig } from './config.js';
import { createDatabase, type Database } from './db/client.js';
import { errorHandler, notFoundHandler } from './errors.js';
import { createFhirRouter } from './fhir/fhir-routes.js';
import { createInMemoryFhirExportStore, type FhirExportStore } from './fhir/fhir-store.js';
import { createLogger, type AppLogger } from './logger.js';
import { buildReadiness } from './readiness.js';
import { requestContextMiddleware } from './request-context.js';

export type AppDependencies = {
  database?: Database;
  logger?: AppLogger;
  sessionStore?: SessionStore;
  auditWriter?: AuditWriter;
  clinicalStore?: ClinicalStore;
  outputStore?: OutputStore;
  memoryStore?: MemoryStore;
  synthesisProvider?: SynthesisProvider;
  evidenceTool?: EvidenceToolAdapter;
  fhirExportStore?: FhirExportStore;
};

export async function createApp(config: AppConfig, dependencies: AppDependencies = {}) {
  const app = express();
  const logger = dependencies.logger ?? createLogger(config);
  const database = dependencies.database ?? createDatabase(config);
  const sessionStore = dependencies.sessionStore ?? (await createInMemorySessionStore(config));
  const auditWriter = dependencies.auditWriter ?? createInMemoryAuditWriter();
  const clinicalStore = dependencies.clinicalStore ?? createInMemoryClinicalStore();
  const outputStore = dependencies.outputStore ?? createInMemoryOutputStore();
  const memoryStore = dependencies.memoryStore ?? createInMemoryMemoryStore();
  const synthesisProvider = dependencies.synthesisProvider ?? createGeminiSynthesisProvider();
  const evidenceTool = dependencies.evidenceTool ?? createMedGemmaEvidenceToolAdapter();
  const fhirExportStore = dependencies.fhirExportStore ?? createInMemoryFhirExportStore();

  app.use(helmet());
  app.use(
    cors({
      credentials: true,
      origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3001',
      ],
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(requestContextMiddleware);
  app.use(sessionMiddleware(sessionStore));

  app.get('/health', (_req, res) => {
    const body: HealthResponse = {
      status: 'ok',
      service: 'matria-api',
      timestamp: new Date().toISOString(),
    };

    res.json(healthResponseSchema.parse(body));
  });

  app.get('/ready', async (_req, res, next) => {
    try {
      const body = await buildReadiness(database);

      res.status(body.status === 'ready' ? 200 : 503).json(readinessResponseSchema.parse(body));
    } catch (error) {
      next(error);
    }
  });

  app.use('/auth', createAuthRouter(sessionStore, auditWriter));
  app.use('/clinical', createClinicalRouter(clinicalStore, auditWriter));
  app.use(
    '/ai',
    createAiRouter({
      clinicalStore,
      auditWriter,
      outputStore,
      memoryStore,
      synthesisProvider,
      evidenceTool,
    }),
  );
  app.use(
    '/fhir',
    createFhirRouter({
      auditWriter,
      clinicalStore,
      outputStore,
      fhirExportStore,
    }),
  );

  app.get('/audit-logs', requirePermission('audit:read'), async (_req, res, next) => {
    try {
      res.json({ data: await auditWriter.list() });
    } catch (error) {
      next(error);
    }
  });

  app.use(notFoundHandler);
  app.use(errorHandler(logger));

  return app;
}
