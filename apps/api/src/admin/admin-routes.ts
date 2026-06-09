import {
  assignRolePermissionsRequestSchema,
  assignUserRolesRequestSchema,
  auditLogListResponseSchema,
  createRoleRequestSchema,
  createUserRequestSchema,
  permissionListResponseSchema,
  roleListResponseSchema,
  roleResponseSchema,
  updateUserRequestSchema,
  userListResponseSchema,
  userResponseSchema,
} from '@matria/contracts';
import type { Router } from 'express';
import { Router as createRouter } from 'express';

import type { AuditWriter } from '../audit/audit-log.js';
import { requirePermission } from '../auth/rbac.js';
import { HttpError } from '../errors.js';
import type { AdminStore } from './admin-store.js';

function requireStringParam(value: string | string[] | undefined, name: string) {
  if (typeof value !== 'string') {
    throw new HttpError(400, 'invalid_route_parameter', `${name} is required.`);
  }
  return value;
}

export function createAdminRouter(adminStore: AdminStore, auditWriter: AuditWriter): Router {
  const router = createRouter();

  router.get('/users', requirePermission('user:admin'), async (_req, res, next) => {
    try {
      res.json(userListResponseSchema.parse({ data: await adminStore.listUsers() }));
    } catch (error) {
      next(error);
    }
  });

  router.post('/users', requirePermission('user:admin'), async (req, res, next) => {
    try {
      const payload = createUserRequestSchema.parse(req.body);
      const user = await adminStore.createUser(payload);

      await auditWriter.record({
        actorUserId: req.user?.id,
        action: 'admin.user.create',
        resourceType: 'user',
        resourceId: user.id,
      });

      res.status(201).json(userResponseSchema.parse({ data: user }));
    } catch (error) {
      next(error);
    }
  });

  router.patch('/users/:userId', requirePermission('user:admin'), async (req, res, next) => {
    try {
      const payload = updateUserRequestSchema.parse(req.body);
      const userId = requireStringParam(req.params.userId, 'userId');
      const user = await adminStore.updateUser(userId, payload);
      if (!user) {
        throw new HttpError(404, 'user_not_found', 'User was not found.');
      }

      await auditWriter.record({
        actorUserId: req.user?.id,
        action: 'admin.user.update',
        resourceType: 'user',
        resourceId: user.id,
      });

      res.json(userResponseSchema.parse({ data: user }));
    } catch (error) {
      next(error);
    }
  });

  router.post('/users/:userId/roles', requirePermission('user:admin'), async (req, res, next) => {
    try {
      const payload = assignUserRolesRequestSchema.parse(req.body);
      const userId = requireStringParam(req.params.userId, 'userId');
      const user = await adminStore.assignUserRoles(userId, payload.roleNames);
      if (!user) {
        throw new HttpError(404, 'user_not_found', 'User was not found.');
      }

      await auditWriter.record({
        actorUserId: req.user?.id,
        action: 'admin.user.roles.assign',
        resourceType: 'user',
        resourceId: user.id,
      });

      res.json(userResponseSchema.parse({ data: user }));
    } catch (error) {
      next(error);
    }
  });

  router.get('/roles', requirePermission('user:admin'), async (_req, res, next) => {
    try {
      res.json(roleListResponseSchema.parse({ data: await adminStore.listRoles() }));
    } catch (error) {
      next(error);
    }
  });

  router.post('/roles', requirePermission('user:admin'), async (req, res, next) => {
    try {
      const payload = createRoleRequestSchema.parse(req.body);
      const role = await adminStore.createRole(payload);

      await auditWriter.record({
        actorUserId: req.user?.id,
        action: 'admin.role.create',
        resourceType: 'role',
        resourceId: role.id,
      });

      res.status(201).json(roleResponseSchema.parse({ data: role }));
    } catch (error) {
      next(error);
    }
  });

  router.post(
    '/roles/:roleId/permissions',
    requirePermission('user:admin'),
    async (req, res, next) => {
      try {
        const payload = assignRolePermissionsRequestSchema.parse(req.body);
        const roleId = requireStringParam(req.params.roleId, 'roleId');
        const role = await adminStore.assignRolePermissions(roleId, payload.permissions);
        if (!role) {
          throw new HttpError(404, 'role_not_found', 'Role was not found.');
        }

        await auditWriter.record({
          actorUserId: req.user?.id,
          action: 'admin.role.permissions.assign',
          resourceType: 'role',
          resourceId: role.id,
        });

        res.json(roleResponseSchema.parse({ data: role }));
      } catch (error) {
        next(error);
      }
    },
  );

  router.get('/permissions', requirePermission('user:admin'), async (_req, res, next) => {
    try {
      res.json(permissionListResponseSchema.parse({ data: await adminStore.listPermissions() }));
    } catch (error) {
      next(error);
    }
  });

  router.get('/audit-logs', requirePermission('audit:read'), async (req, res, next) => {
    try {
      await auditWriter.record({
        actorUserId: req.user?.id,
        action: 'audit.read',
        resourceType: 'audit_log',
      });
      res.json(auditLogListResponseSchema.parse({ data: await auditWriter.list() }));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
