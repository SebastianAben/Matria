import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

export type RequestContext = {
  requestId: string;
  startedAt: number;
};

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = req.header('x-request-id') ?? randomUUID();
  res.locals.requestContext = {
    requestId,
    startedAt: Date.now(),
  } satisfies RequestContext;
  res.setHeader('x-request-id', requestId);
  next();
}

export function getRequestContext(res: Response): RequestContext {
  return res.locals.requestContext as RequestContext;
}
