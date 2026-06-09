import { randomUUID } from 'node:crypto';

import type { PermissionAction, SessionUser } from '@matria/contracts';
import bcrypt from 'bcryptjs';

import type { AppConfig } from '../config.js';

export const sessionCookieName = 'matria_session';

export type SessionRecord = {
  token: string;
  user: SessionUser;
  createdAt: Date;
};

export type SessionStore = {
  createSession(email: string, password: string): Promise<SessionRecord | undefined>;
  getSession(token: string | undefined): Promise<SessionRecord | undefined>;
  deleteSession(token: string | undefined): Promise<void>;
};

const adminPermissions: PermissionAction[] = [
  'patient:read',
  'encounter:write',
  'file:upload',
  'ai:synthesis:request',
  'output:approve',
  'fhir:export',
  'user:admin',
  'audit:read',
  'system:configure',
];

export async function createInMemorySessionStore(config: AppConfig): Promise<SessionStore> {
  const sessions = new Map<string, SessionRecord>();
  const adminEmail = config.adminBootstrapEmail ?? 'admin@matria.local';
  const adminPassword = config.adminBootstrapPassword ?? 'development-password';
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
  const adminUser: SessionUser = {
    id: '343f9737-e017-469d-af7e-78cdd15a459f',
    email: adminEmail,
    displayName: 'Bootstrap Administrator',
    permissions: adminPermissions,
  };

  return {
    async createSession(email, password) {
      const passwordMatches =
        email.toLowerCase() === adminEmail.toLowerCase() &&
        (await bcrypt.compare(password, adminPasswordHash));

      if (!passwordMatches) {
        return undefined;
      }

      const record: SessionRecord = {
        token: randomUUID(),
        user: adminUser,
        createdAt: new Date(),
      };
      sessions.set(record.token, record);
      return record;
    },
    async getSession(token) {
      if (!token) {
        return undefined;
      }
      return sessions.get(token);
    },
    async deleteSession(token) {
      if (token) {
        sessions.delete(token);
      }
    },
  };
}
