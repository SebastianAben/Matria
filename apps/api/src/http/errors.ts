import type { ErrorCode } from "@matria/shared";

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(code: ErrorCode, message: string, status = 400, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const unauthenticated = () =>
  new AppError("UNAUTHENTICATED", "Authentication is required.", 401);

export const forbidden = () =>
  new AppError("FORBIDDEN", "You do not have permission for this action.", 403);

export const notFound = (resource = "Resource") =>
  new AppError("NOT_FOUND", `${resource} was not found.`, 404);
