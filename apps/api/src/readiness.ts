import type { ReadinessResponse } from '@matria/contracts';

import type { Database } from './db/client.js';
import { getPendingMigrations, isPgvectorAvailable } from './db/migrations.js';

export async function buildReadiness(database: Database | undefined): Promise<ReadinessResponse> {
  const checks: ReadinessResponse['checks'] = {
    database: 'fail',
    migrations: 'fail',
    pgvector: 'fail',
    contracts: 'pass',
  };

  if (!database) {
    return {
      status: 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  try {
    await database.query('SELECT 1;');
    checks.database = 'pass';
  } catch {
    return {
      status: 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const pendingMigrations = await getPendingMigrations(database);
    checks.migrations = pendingMigrations.length === 0 ? 'pass' : 'warn';
  } catch {
    checks.migrations = 'fail';
  }

  try {
    checks.pgvector = (await isPgvectorAvailable(database)) ? 'pass' : 'warn';
  } catch {
    checks.pgvector = 'fail';
  }

  return {
    status: Object.values(checks).every((check) => check === 'pass') ? 'ready' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  };
}
