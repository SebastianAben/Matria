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
  {
    id: '0003',
    name: 'clinical-domain-foundation',
    sql: `
      CREATE TABLE IF NOT EXISTS patients (
        id uuid PRIMARY KEY,
        hospital_record_number text NOT NULL UNIQUE,
        display_name text NOT NULL,
        date_of_birth date,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS pregnancy_episodes (
        id uuid PRIMARY KEY,
        patient_id uuid NOT NULL REFERENCES patients(id),
        status text NOT NULL,
        estimated_due_date date,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS encounters (
        id uuid PRIMARY KEY,
        patient_id uuid NOT NULL REFERENCES patients(id),
        pregnancy_episode_id uuid NOT NULL REFERENCES pregnancy_episodes(id),
        type text NOT NULL,
        status text NOT NULL,
        started_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS structured_observations (
        id uuid PRIMARY KEY,
        encounter_id uuid NOT NULL REFERENCES encounters(id),
        kind text NOT NULL,
        code text,
        value jsonb NOT NULL,
        unit text,
        confidence numeric,
        source text NOT NULL,
        verified_by_clinician boolean NOT NULL DEFAULT false
      );

      CREATE INDEX IF NOT EXISTS idx_pregnancy_episodes_patient_id
        ON pregnancy_episodes(patient_id);
      CREATE INDEX IF NOT EXISTS idx_encounters_patient_episode
        ON encounters(patient_id, pregnancy_episode_id);
      CREATE INDEX IF NOT EXISTS idx_structured_observations_encounter_id
        ON structured_observations(encounter_id);
    `,
  },
  {
    id: '0004',
    name: 'ai-review-lifecycle',
    sql: `
      CREATE TABLE IF NOT EXISTS generated_outputs (
        id uuid PRIMARY KEY,
        encounter_id uuid NOT NULL REFERENCES encounters(id),
        kind text NOT NULL,
        status text NOT NULL,
        content text NOT NULL,
        preserves_rule_result_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
        uncertainty_notes jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS clinical_approvals (
        id uuid PRIMARY KEY,
        output_id uuid NOT NULL REFERENCES generated_outputs(id),
        approver_user_id uuid NOT NULL,
        action text NOT NULL,
        edited_content text,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS patient_memory_entries (
        id uuid PRIMARY KEY,
        patient_id uuid NOT NULL REFERENCES patients(id),
        pregnancy_episode_id uuid NOT NULL REFERENCES pregnancy_episodes(id),
        encounter_id uuid NOT NULL REFERENCES encounters(id),
        source_output_id uuid NOT NULL REFERENCES generated_outputs(id),
        content text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_generated_outputs_encounter_id
        ON generated_outputs(encounter_id);
      CREATE INDEX IF NOT EXISTS idx_patient_memory_scope
        ON patient_memory_entries(patient_id, pregnancy_episode_id);
    `,
  },
  {
    id: '0005',
    name: 'fhir-export-artifacts',
    sql: `
      CREATE TABLE IF NOT EXISTS fhir_exports (
        id uuid PRIMARY KEY,
        encounter_id uuid NOT NULL REFERENCES encounters(id),
        output_id uuid NOT NULL REFERENCES generated_outputs(id),
        approving_clinician_user_id uuid NOT NULL,
        status text NOT NULL,
        artifact_json jsonb NOT NULL,
        generated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_fhir_exports_output_id
        ON fhir_exports(output_id);
      CREATE INDEX IF NOT EXISTS idx_fhir_exports_encounter_id
        ON fhir_exports(encounter_id);
    `,
  },
  {
    id: '0006',
    name: 'admin-users-and-rbac-assignments',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY,
        email text NOT NULL UNIQUE,
        display_name text NOT NULL,
        password_hash text NOT NULL,
        status text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        PRIMARY KEY (role_id, permission_id)
      );

      CREATE TABLE IF NOT EXISTS user_roles (
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, role_id)
      );

      INSERT INTO roles (id, name, description)
      VALUES
        ('10000000-0000-4000-8000-000000000001', 'clinician', 'Creates and reviews ANC encounters.'),
        ('10000000-0000-4000-8000-000000000002', 'obgyn_specialist', 'Reviews escalated obstetric cases.'),
        ('10000000-0000-4000-8000-000000000003', 'nurse_midwife', 'Captures intake, vitals, and encounter context.'),
        ('10000000-0000-4000-8000-000000000004', 'lab_staff', 'Uploads and verifies lab-related files.'),
        ('10000000-0000-4000-8000-000000000005', 'radiology_sonographer', 'Uploads ultrasound media and metadata.'),
        ('10000000-0000-4000-8000-000000000006', 'hospital_admin', 'Manages users, roles, and system configuration.'),
        ('10000000-0000-4000-8000-000000000007', 'auditor', 'Reads audit logs and compliance reports.'),
        ('10000000-0000-4000-8000-000000000008', 'it_operator', 'Manages operational health and configuration.')
      ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

      INSERT INTO permissions (id, action, description)
      VALUES
        ('20000000-0000-4000-8000-000000000001', 'patient:read', 'Read patient records.'),
        ('20000000-0000-4000-8000-000000000002', 'encounter:write', 'Create and update encounters.'),
        ('20000000-0000-4000-8000-000000000003', 'file:upload', 'Upload clinical files.'),
        ('20000000-0000-4000-8000-000000000004', 'ai:synthesis:request', 'Request AI synthesis.'),
        ('20000000-0000-4000-8000-000000000005', 'output:approve', 'Approve clinical outputs.'),
        ('20000000-0000-4000-8000-000000000006', 'fhir:export', 'Export approved FHIR artifacts.'),
        ('20000000-0000-4000-8000-000000000007', 'user:admin', 'Manage users and roles.'),
        ('20000000-0000-4000-8000-000000000008', 'audit:read', 'Read audit logs.'),
        ('20000000-0000-4000-8000-000000000009', 'system:configure', 'Configure system settings.')
      ON CONFLICT (action) DO UPDATE SET description = EXCLUDED.description;

      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      JOIN permissions p ON (
        (r.name = 'hospital_admin') OR
        (r.name = 'auditor' AND p.action = 'audit:read') OR
        (r.name = 'it_operator' AND p.action IN ('audit:read', 'system:configure')) OR
        (r.name IN ('clinician', 'obgyn_specialist') AND p.action IN ('patient:read', 'encounter:write', 'file:upload', 'ai:synthesis:request', 'output:approve', 'fhir:export')) OR
        (r.name = 'nurse_midwife' AND p.action IN ('patient:read', 'encounter:write', 'file:upload', 'ai:synthesis:request')) OR
        (r.name IN ('lab_staff', 'radiology_sonographer') AND p.action IN ('patient:read', 'file:upload'))
      )
      ON CONFLICT DO NOTHING;

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
      CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
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
