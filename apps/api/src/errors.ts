import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import type { AppLogger } from './logger.js';
import { getRequestContext } from './request-context.js';

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new HttpError(404, 'not_found', `Route ${req.method} ${req.path} was not found.`));
}

export function errorHandler(logger: AppLogger) {
  return (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const context = getRequestContext(res);

    if (err instanceof ZodError) {
      res.status(400).json({
        code: 'validation_failed',
        message: 'Request validation failed.',
        details: err.flatten(),
      });
      return;
    }

    if (err instanceof HttpError) {
      res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
      });
      return;
    }

    logger.error({ err, requestId: context.requestId }, 'Unhandled API error');
    res.status(500).json({
      code: 'internal_error',
      message: 'An unexpected API error occurred.',
    });
  };
}
