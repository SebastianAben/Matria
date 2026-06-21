import type { AuditOutcome } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db/prisma.js";

export async function writeAudit(input: {
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  outcome: AuditOutcome;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      outcome: input.outcome,
      requestId: input.requestId,
      metadata: input.metadata as Prisma.InputJsonValue | undefined
    }
  });
}
