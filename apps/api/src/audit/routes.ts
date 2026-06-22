import { Router } from "express";
import { z } from "zod";
import { requirePermission } from "../auth/middleware.js";
import { prisma } from "../db/prisma.js";
import { sendOk } from "../http/responses.js";

const auditQuerySchema = z.object({
  actorId: z.string().uuid().optional(),
  action: z.string().min(1).max(160).optional(),
  targetType: z.string().min(1).max(120).optional(),
  targetId: z.string().min(1).max(160).optional(),
  outcome: z.enum(["success", "failure", "denied"]).optional(),
  requestId: z.string().min(1).max(160).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
});

export const auditRouter = Router();

auditRouter.get("/audit-logs", requirePermission("audit:read"), async (req, res, next) => {
  try {
    const query = auditQuerySchema.parse(req.query);
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        actorId: query.actorId,
        action: query.action ? { contains: query.action, mode: "insensitive" } : undefined,
        targetType: query.targetType,
        targetId: query.targetId,
        outcome: query.outcome,
        requestId: query.requestId,
        createdAt:
          query.from || query.to
            ? { gte: query.from ? new Date(query.from) : undefined, lte: query.to ? new Date(query.to) : undefined }
            : undefined
      },
      include: { actor: { select: { id: true, email: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    return sendOk(req, res, { auditLogs });
  } catch (error) {
    return next(error);
  }
});
