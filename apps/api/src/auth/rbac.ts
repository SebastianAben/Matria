import type { PermissionAction, SessionUser } from '@matria/contracts';
import type { NextFunction, Request, Response } from 'express';

import { HttpError } from '../errors.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: SessionUser;
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    next(new HttpError(401, 'unauthenticated', 'Authentication is required.'));
    return;
  }
  next();
}

export function requirePermission(permission: PermissionAction) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new HttpError(401, 'unauthenticated', 'Authentication is required.'));
      return;
    }

    if (!req.user.permissions.includes(permission)) {
      next(new HttpError(403, 'forbidden', `Permission ${permission} is required.`));
      return;
    }

    next();
  };
}
