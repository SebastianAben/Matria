import { randomUUID } from 'node:crypto';

import type { AuditLog } from '@matria/contracts';

import type { Database } from '../db/client.js';

export type AuditEventInput = Omit<AuditLog, 'id' | 'createdAt'>;

export type AuditWriter = {
  record(event: AuditEventInput): Promise<AuditLog>;
  list(): Promise<AuditLog[]>;
};

export function createInMemoryAuditWriter(): AuditWriter {
  const events: AuditLog[] = [];

  return {
    async record(event) {
      const auditLog: AuditLog = {
        id: randomUUID(),
        ...event,
        createdAt: new Date().toISOString(),
      };
      events.push(auditLog);
      return auditLog;
    },
    async list() {
      return [...events].reverse();
    },
  };
}

export function createDatabaseAuditWriter(database: Database): AuditWriter {
  return {
    async record(event) {
      const auditLog: AuditLog = {
        id: randomUUID(),
        ...event,
        createdAt: new Date().toISOString(),
      };

      await database.query(
        `
          INSERT INTO audit_logs (
            id, actor_user_id, action, resource_type, resource_id,
            patient_id, pregnancy_episode_id, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
        `,
        [
          auditLog.id,
          auditLog.actorUserId,
          auditLog.action,
          auditLog.resourceType,
          auditLog.resourceId,
          auditLog.patientId,
          auditLog.pregnancyEpisodeId,
          auditLog.createdAt,
        ],
      );

      return auditLog;
    },
    async list() {
      const result = await database.query<{
        id: string;
        actor_user_id?: string;
        action: string;
        resource_type: string;
        resource_id?: string;
        patient_id?: string;
        pregnancy_episode_id?: string;
        created_at: Date;
      }>(`
        SELECT id, actor_user_id, action, resource_type, resource_id,
          patient_id, pregnancy_episode_id, created_at
        FROM audit_logs
        ORDER BY created_at DESC
        LIMIT 100;
      `);

      return result.rows.map((row) => ({
        id: row.id,
        actorUserId: row.actor_user_id,
        action: row.action,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        patientId: row.patient_id,
        pregnancyEpisodeId: row.pregnancy_episode_id,
        createdAt: row.created_at.toISOString(),
      }));
    },
  };
}
