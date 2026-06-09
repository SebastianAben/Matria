import type { Database } from './client.js';

export type Migration = {
  id: string;
  name: string;
  sql: string;
};

export const migrations: Migration[] = [
  {
    id: '0001',
    name: 'enable-pgvector',
    sql: 'CREATE EXTENSION IF NOT EXISTS vector;',
  },
  {
    id: '0002',
    name: 'rbac-and-audit-foundation',
    sql: `
      CREATE TABLE IF NOT EXISTS roles (
        id uuid PRIMARY KEY,
        name text NOT NULL UNIQUE,
        description text,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS permissions (
        id uuid PRIMARY KEY,
        action text NOT NULL UNIQUE,
        description text,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id uuid PRIMARY KEY,
        actor_user_id uuid,
        action text NOT NULL,
        resource_type text NOT NULL,
        resource_id text,
        patient_id uuid,
        pregnancy_episode_id uuid,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `,
  },
];

export async function ensureMigrationTable(database: Database) {
  await database.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id text PRIMARY KEY,
      name text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

export async function getAppliedMigrationIds(database: Database): Promise<Set<string>> {
  await ensureMigrationTable(database);
  const result = await database.query<{ id: string }>(
    'SELECT id FROM schema_migrations ORDER BY id;',
  );
  return new Set(result.rows.map((row) => row.id));
}

export async function getPendingMigrations(database: Database): Promise<Migration[]> {
  const applied = await getAppliedMigrationIds(database);
  return migrations.filter((migration) => !applied.has(migration.id));
}

export async function runMigrations(database: Database) {
  await ensureMigrationTable(database);
  const pending = await getPendingMigrations(database);

  for (const migration of pending) {
    await database.query('BEGIN');
    try {
      await database.query(migration.sql);
      await database.query('INSERT INTO schema_migrations (id, name) VALUES ($1, $2);', [
        migration.id,
        migration.name,
      ]);
      await database.query('COMMIT');
    } catch (error) {
      await database.query('ROLLBACK');
      throw error;
    }
  }

  return {
    applied: pending.map((migration) => migration.id),
  };
}

export async function isPgvectorAvailable(database: Database): Promise<boolean> {
  const result = await database.query<{ exists: boolean }>(
    "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') AS exists;",
  );
  return result.rows[0]?.exists === true;
}
