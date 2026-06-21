import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      currentUser?: {
        id: string;
        email: string;
        fullName: string;
        permissions: Set<string>;
      };
    }
  }
}

export function requestContext(req: Request, res: Response, next: NextFunction) {
  req.requestId = req.header("x-request-id") ?? randomUUID();
  res.setHeader("x-request-id", req.requestId);
  next();
}
