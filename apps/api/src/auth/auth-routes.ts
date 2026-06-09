import { loginRequestSchema, sessionResponseSchema } from '@matria/contracts';
import type { Router } from 'express';
import { Router as createRouter } from 'express';

import type { AuditWriter } from '../audit/audit-log.js';
import { HttpError } from '../errors.js';
import type { SessionStore } from './session-store.js';
import { sessionCookieName } from './session-store.js';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: false,
  path: '/',
};

export function createAuthRouter(sessionStore: SessionStore, auditWriter: AuditWriter): Router {
  const router = createRouter();

  router.post('/login', async (req, res, next) => {
    try {
      const credentials = loginRequestSchema.parse(req.body);
      const session = await sessionStore.createSession(credentials.email, credentials.password);

      if (!session) {
        throw new HttpError(401, 'invalid_credentials', 'Invalid email or password.');
      }

      res.cookie(sessionCookieName, session.token, cookieOptions);
      await auditWriter.record({
        actorUserId: session.user.id,
        action: 'auth.login',
        resourceType: 'session',
        resourceId: session.token,
      });

      res.json(sessionResponseSchema.parse({ authenticated: true, user: session.user }));
    } catch (error) {
      next(error);
    }
  });

  router.post('/logout', async (req, res, next) => {
    try {
      const token = req.cookies[sessionCookieName] as string | undefined;
      await sessionStore.deleteSession(token);
      res.clearCookie(sessionCookieName, cookieOptions);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.get('/session', (req, res) => {
    res.json(sessionResponseSchema.parse({ authenticated: Boolean(req.user), user: req.user }));
  });

  return router;
}
