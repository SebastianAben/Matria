import type { NextFunction, Request, Response } from "express";
import { forbidden, unauthenticated } from "../http/errors.js";
import { hashToken } from "./sessions.js";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { writeAudit } from "../audit.js";

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[env.SESSION_COOKIE_NAME] as string | undefined;
  if (!token) return next();

  const session = await prisma.session.findFirst({
    where: {
      tokenHash: hashToken(token),
      revokedAt: null,
      expiresAt: { gt: new Date() },
      user: { status: "active" }
    },
    include: {
      user: {
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: { include: { permission: true } }
                }
              }
            }
          }
        }
      }
    }
  });

  if (!session) return next();

  req.currentUser = {
    id: session.user.id,
    email: session.user.email,
    fullName: session.user.fullName,
    permissions: new Set(
      session.user.roles.flatMap((role) =>
        role.role.permissions.map((permission) => permission.permission.key)
      )
    )
  };
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.currentUser) return next(unauthenticated());
  return next();
}

export function requirePermission(permission: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.currentUser) return next(unauthenticated());
    if (!req.currentUser.permissions.has(permission)) {
      await writeAudit({
        actorId: req.currentUser.id,
        action: "permission.denied",
        targetType: "permission",
        targetId: permission,
        outcome: "denied",
        requestId: req.requestId
      });
      return next(forbidden());
    }
    return next();
  };
}
