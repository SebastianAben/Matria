import { permissionKeys, roleDescriptions, roleKeys } from "../auth/permissions.js";
import { Router } from "express";
import { z } from "zod";
import { writeAudit } from "../audit.js";
import { requirePermission } from "../auth/middleware.js";
import { hashPassword } from "../auth/passwords.js";
import { prisma } from "../db/prisma.js";
import { notFound } from "../http/errors.js";
import { requiredParam } from "../http/params.js";
import { sendOk } from "../http/responses.js";

const createUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(200),
  password: z.string().min(8),
  roleKeys: z.array(z.enum(roleKeys)).default([])
});

const createRoleSchema = z.object({
  key: z.string().min(1).max(80),
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(300),
  permissionKeys: z.array(z.enum(permissionKeys)).default([])
});

const assignRoleSchema = z.object({
  roleKey: z.enum(roleKeys)
});

const patchUserSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  status: z.enum(["active", "disabled"]).optional(),
  roleKeys: z.array(z.enum(roleKeys)).optional()
});

export const adminRouter = Router();

adminRouter.get("/users", requirePermission("admin:users"), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { roles: { include: { role: true } } }
    });
    return sendOk(req, res, {
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        status: user.status,
        roles: user.roles.map((role) => role.role.key)
      }))
    });
  } catch (error) {
    return next(error);
  }
});

adminRouter.post("/users", requirePermission("admin:users"), async (req, res, next) => {
  try {
    const input = createUserSchema.parse(req.body);
    const roles = await prisma.role.findMany({ where: { key: { in: input.roleKeys } } });
    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        fullName: input.fullName,
        passwordHash: await hashPassword(input.password),
        roles: {
          create: roles.map((role) => ({ roleId: role.id }))
        }
      },
      include: { roles: { include: { role: true } } }
    });
    await writeAudit({
      actorId: req.currentUser?.id,
      action: "admin.user.create",
      targetType: "user",
      targetId: user.id,
      outcome: "success",
      requestId: req.requestId,
      metadata: { roleKeys: input.roleKeys }
    });
    return sendOk(
      req,
      res,
      {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          roles: user.roles.map((role) => role.role.key)
        }
      },
      201
    );
  } catch (error) {
    return next(error);
  }
});

adminRouter.post(
  "/users/:userId/roles",
  requirePermission("admin:users"),
  async (req, res, next) => {
    try {
      const input = assignRoleSchema.parse(req.body);
      const userId = requiredParam(req, "userId");
      const [user, role] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.role.findUnique({ where: { key: input.roleKey } })
      ]);
      if (!user) throw notFound("User");
      if (!role) throw notFound("Role");
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        create: { userId: user.id, roleId: role.id },
        update: {}
      });
      await writeAudit({
        actorId: req.currentUser?.id,
        action: "admin.user.role_assign",
        targetType: "user",
        targetId: user.id,
        outcome: "success",
        requestId: req.requestId,
        metadata: { roleKey: input.roleKey }
      });
      return sendOk(req, res, { assigned: true });
    } catch (error) {
      return next(error);
    }
  }
);

adminRouter.patch(
  "/users/:userId",
  requirePermission("admin:users"),
  async (req, res, next) => {
    try {
      const userId = requiredParam(req, "userId");
      const input = patchUserSchema.parse(req.body);
      const existing = await prisma.user.findUnique({ where: { id: userId } });
      if (!existing) throw notFound("User");
      const user = await prisma.$transaction(async (tx) => {
        if (input.roleKeys) {
          const roles = await tx.role.findMany({ where: { key: { in: input.roleKeys } } });
          await tx.userRole.deleteMany({ where: { userId } });
          for (const role of roles) {
            await tx.userRole.create({ data: { userId, roleId: role.id } });
          }
        }
        return tx.user.update({
          where: { id: userId },
          data: {
            fullName: input.fullName,
            status: input.status
          },
          include: { roles: { include: { role: true } } }
        });
      });
      await writeAudit({
        actorId: req.currentUser?.id,
        action: "admin.user.update",
        targetType: "user",
        targetId: user.id,
        outcome: "success",
        requestId: req.requestId,
        metadata: { status: input.status, roleKeys: input.roleKeys }
      });
      return sendOk(req, res, {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          status: user.status,
          roles: user.roles.map((role) => role.role.key)
        }
      });
    } catch (error) {
      return next(error);
    }
  }
);

adminRouter.get(
  "/system-health",
  requirePermission("system:config"),
  async (req, res, next) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return sendOk(req, res, {
        services: [
          { name: "AI Service", status: "operational", uptimePercent: 99.6 },
          { name: "Transcript Service", status: "operational", uptimePercent: 99.8 },
          { name: "Storage Service", status: "operational", uptimePercent: 99.9 },
          { name: "Auth Service", status: "operational", uptimePercent: 100 }
        ],
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      return next(error);
    }
  }
);

adminRouter.get("/roles", requirePermission("admin:roles"), async (req, res, next) => {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { key: "asc" },
      include: { permissions: { include: { permission: true } } }
    });
    return sendOk(req, res, {
      roles: roles.map((role) => ({
        key: role.key,
        name: role.name,
        description: role.description,
        permissions: role.permissions.map((permission) => permission.permission.key)
      }))
    });
  } catch (error) {
    return next(error);
  }
});

adminRouter.post("/roles", requirePermission("admin:roles"), async (req, res, next) => {
  try {
    const input = createRoleSchema.parse(req.body);
    const permissions = await prisma.permission.findMany({
      where: { key: { in: input.permissionKeys } }
    });
    const role = await prisma.role.upsert({
      where: { key: input.key },
      create: {
        key: input.key,
        name: input.name,
        description: input.description,
        permissions: { create: permissions.map((permission) => ({ permissionId: permission.id })) }
      },
      update: {
        name: input.name,
        description: input.description
      }
    });
    await writeAudit({
      actorId: req.currentUser?.id,
      action: "admin.role.upsert",
      targetType: "role",
      targetId: role.id,
      outcome: "success",
      requestId: req.requestId
    });
    return sendOk(req, res, { role }, 201);
  } catch (error) {
    return next(error);
  }
});

export async function seedRolesAndPermissions() {
  for (const key of permissionKeys) {
    await prisma.permission.upsert({
      where: { key },
      create: { key, description: key },
      update: {}
    });
  }

  for (const key of roleKeys) {
    const role = await prisma.role.upsert({
      where: { key },
      create: {
        key,
        name: key
          .split("_")
          .map((part) => part[0]?.toUpperCase() + part.slice(1))
          .join(" "),
        description: roleDescriptions[key]
      },
      update: { description: roleDescriptions[key] }
    });

    const permissions = await prisma.permission.findMany({
      where: { key: { in: roleKeyPermissions(key) } }
    });

    for (const permission of permissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        create: { roleId: role.id, permissionId: permission.id },
        update: {}
      });
    }
  }
}

function roleKeyPermissions(roleKey: (typeof roleKeys)[number]) {
  return {
    clinician: [
      "patient:read",
      "patient:write",
      "pregnancy_episode:write",
      "encounter:read",
      "encounter:write",
      "consent:write",
      "clinical_file:write",
      "observation:write",
      "session_note:write",
      "rule:evaluate",
      "rule:acknowledge",
      "ambient_session:start",
      "audio:process",
      "transcript:correct",
      "ai:synthesis",
      "suggestion:resolve",
      "output:approve",
      "fhir:export"
    ],
    obgyn_specialist: [
      "patient:read",
      "encounter:read",
      "session_note:write",
      "rule:evaluate",
      "rule:acknowledge",
      "suggestion:resolve",
      "output:approve",
      "fhir:export"
    ],
    nurse_midwife: [
      "patient:read",
      "patient:write",
      "pregnancy_episode:write",
      "encounter:read",
      "encounter:write",
      "consent:write",
      "clinical_file:write",
      "observation:write",
      "session_note:write",
      "rule:evaluate",
      "ambient_session:start"
    ],
    lab_staff: ["patient:read", "encounter:read", "clinical_file:write", "observation:write"],
    radiology_sonographer: ["patient:read", "encounter:read", "clinical_file:write"],
    hospital_admin: ["admin:users", "admin:roles", "system:config", "audit:read"],
    auditor: ["audit:read"],
    it_operator: ["system:config"]
  }[roleKey];
}
