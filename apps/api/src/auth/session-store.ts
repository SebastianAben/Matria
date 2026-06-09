import { randomUUID } from 'node:crypto';

import type { SessionUser } from '@matria/contracts';

import type { AdminStore } from '../admin/admin-store.js';
import { createInMemoryAdminStore } from '../admin/admin-store.js';
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

export function createSessionStore(adminStore: AdminStore): SessionStore {
  const sessions = new Map<string, SessionRecord>();

  return {
    async createSession(email, password) {
      const user = await adminStore.findSessionUser(email, password);
      if (!user) {
        return undefined;
      }

      const record: SessionRecord = {
        token: randomUUID(),
        user,
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

export async function createInMemorySessionStore(config: AppConfig): Promise<SessionStore> {
  const adminStore = await createInMemoryAdminStore(config);
  return createSessionStore(adminStore);
}
