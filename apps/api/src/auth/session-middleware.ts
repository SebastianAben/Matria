import type { NextFunction, Request, Response } from 'express';

import type { SessionStore } from './session-store.js';
import { sessionCookieName } from './session-store.js';

export function sessionMiddleware(sessionStore: SessionStore) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const token = req.cookies[sessionCookieName] as string | undefined;
    const session = await sessionStore.getSession(token);

    if (session) {
      req.user = session.user;
    }

    next();
  };
}
