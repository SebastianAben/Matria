import { randomUUID } from 'node:crypto';

import {
  healthResponseSchema,
  readinessResponseSchema,
  type HealthResponse,
  type ReadinessResponse,
} from '@matria/contracts';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import type { AppConfig } from './config.js';

export function createApp(config: AppConfig) {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use((req, res, next) => {
    const requestId = req.header('x-request-id') ?? randomUUID();
    res.setHeader('x-request-id', requestId);
    next();
  });

  app.get('/health', (_req, res) => {
    const body: HealthResponse = {
      status: 'ok',
      service: 'matria-api',
      timestamp: new Date().toISOString(),
    };

    res.json(healthResponseSchema.parse(body));
  });

  app.get('/ready', (_req, res) => {
    const checks = {
      database: config.databaseUrl ? 'pass' : 'warn',
      contracts: 'pass',
    } as const;

    const body: ReadinessResponse = {
      status: checks.database === 'pass' ? 'ready' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    };

    res.status(body.status === 'ready' ? 200 : 503).json(readinessResponseSchema.parse(body));
  });

  return app;
}
