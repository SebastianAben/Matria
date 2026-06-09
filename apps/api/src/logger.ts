import pino from 'pino';

import type { AppConfig } from './config.js';

export function createLogger(config: Pick<AppConfig, 'appEnv'>) {
  return pino({
    level: config.appEnv === 'test' ? 'silent' : 'info',
    base: {
      service: 'matria-api',
      environment: config.appEnv,
    },
  });
}

export type AppLogger = ReturnType<typeof createLogger>;
