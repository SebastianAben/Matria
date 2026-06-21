import { fail, ok } from "@matria/shared";
import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "./errors.js";

export function sendOk<T>(req: Request, res: Response, data: T, status = 200) {
  return res.status(status).json(ok(data, req.requestId));
}

export function notFoundHandler(req: Request, res: Response) {
  return res
    .status(404)
    .json(fail("NOT_FOUND", `Route ${req.method} ${req.path} was not found.`, req.requestId));
}

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res
      .status(400)
      .json(
        fail("VALIDATION_FAILED", "Request validation failed.", req.requestId, error.flatten())
      );
  }

  if (error instanceof AppError) {
    return res
      .status(error.status)
      .json(fail(error.code, error.message, req.requestId, error.details));
  }

  console.error(error);
  return res
    .status(500)
    .json(fail("INTERNAL_ERROR", "An unexpected error occurred.", req.requestId));
}
