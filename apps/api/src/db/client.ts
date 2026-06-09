import { Pool, type PoolClient } from 'pg';

import type { AppConfig } from '../config.js';

export type QueryResult<T> = {
  rows: T[];
  rowCount: number | null;
};

export type Database = {
  query<T = unknown>(text: string, values?: unknown[]): Promise<QueryResult<T>>;
  connect(): Promise<PoolClient>;
  end(): Promise<void>;
};

export function createDatabase(config: Pick<AppConfig, 'databaseUrl'>): Database | undefined {
  if (!config.databaseUrl) {
    return undefined;
  }

  return new Pool({
    connectionString: config.databaseUrl,
  });
}
