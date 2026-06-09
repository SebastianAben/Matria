import { randomUUID } from 'node:crypto';

import type {
  Permission,
  PermissionAction,
  Role,
  RoleName,
  SessionUser,
  User,
  UserStatus,
} from '@matria/contracts';
import bcrypt from 'bcryptjs';

import type { AppConfig } from '../config.js';
import type { Database } from '../db/client.js';

type UserRecord = User & {
  passwordHash: string;
};

export type CreateUserInput = {
  email: string;
  displayName: string;
  password: string;
  status: UserStatus;
};

export type UpdateUserInput = {
  displayName?: string | undefined;
  status?: UserStatus | undefined;
};

export type AdminStore = {
  ensureBootstrapAdmin(): Promise<User>;
  createUser(input: CreateUserInput): Promise<User>;
  updateUser(userId: string, input: UpdateUserInput): Promise<User | undefined>;
  assignUserRoles(userId: string, roleNames: RoleName[]): Promise<User | undefined>;
  listUsers(): Promise<User[]>;
  findSessionUser(email: string, password: string): Promise<SessionUser | undefined>;
  listRoles(): Promise<Role[]>;
  createRole(input: { name: RoleName; description?: string | undefined }): Promise<Role>;
  assignRolePermissions(roleId: string, permissions: PermissionAction[]): Promise<Role | undefined>;
  listPermissions(): Promise<Permission[]>;
};

const nowIso = () => new Date().toISOString();

const roleDescriptions: Record<RoleName, string> = {
  clinician: 'Creates and reviews ANC encounters.',
  obgyn_specialist: 'Reviews escalated obstetric cases.',
  nurse_midwife: 'Captures intake, vitals, and encounter context.',
  lab_staff: 'Uploads and verifies lab-related files.',
  radiology_sonographer: 'Uploads ultrasound media and metadata.',
  hospital_admin: 'Manages users, roles, and system configuration.',
  auditor: 'Reads audit logs and compliance reports.',
  it_operator: 'Manages operational health and configuration.',
};

export const permissionActions: PermissionAction[] = [
  'patient:read',
  'encounter:write',
  'file:upload',
  'ai:synthesis:request',
  'output:approve',
  'fhir:export',
  'user:admin',
  'audit:read',
  'system:configure',
];

export const roleNames = Object.keys(roleDescriptions) as RoleName[];

const defaultRolePermissions: Record<RoleName, PermissionAction[]> = {
  clinician: [
    'patient:read',
    'encounter:write',
    'file:upload',
    'ai:synthesis:request',
    'output:approve',
    'fhir:export',
  ],
  obgyn_specialist: [
    'patient:read',
    'encounter:write',
    'file:upload',
    'ai:synthesis:request',
    'output:approve',
    'fhir:export',
  ],
  nurse_midwife: ['patient:read', 'encounter:write', 'file:upload', 'ai:synthesis:request'],
  lab_staff: ['patient:read', 'file:upload'],
  radiology_sonographer: ['patient:read', 'file:upload'],
  hospital_admin: permissionActions,
  auditor: ['audit:read'],
  it_operator: ['audit:read', 'system:configure'],
};

export async function createInMemoryAdminStore(config: Partial<AppConfig>): Promise<AdminStore> {
  const createdAt = nowIso();
  const permissions = new Map<PermissionAction, Permission>(
    permissionActions.map((action, index) => [
      action,
      {
        id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
        action,
        description: action,
        createdAt,
      },
    ]),
  );
  const roles = new Map<RoleName, Role>(
    roleNames.map((name, index) => [
      name,
      {
        id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
        name,
        description: roleDescriptions[name],
        permissions: defaultRolePermissions[name],
        createdAt,
      },
    ]),
  );
  const users = new Map<string, UserRecord>();

  const toPublicUser = (user: UserRecord): User => {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      status: user.status,
      roleNames: user.roleNames,
      permissions: user.permissions,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  };

  const getUserByIdOrEmail = (userId: string) =>
    users.get(userId) ??
    [...users.values()].find((user) => user.email.toLowerCase() === userId.toLowerCase());

  const ensureBootstrapAdmin = async () => {
    const email = config.adminBootstrapEmail ?? 'admin@matria.local';
    const password = config.adminBootstrapPassword ?? 'development-password';
    const existing = getUserByIdOrEmail(email);

    if (existing) {
      return toPublicUser(existing);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const timestamp = nowIso();
    const user: UserRecord = {
      id: '343f9737-e017-469d-af7e-78cdd15a459f',
      email,
      displayName: 'Bootstrap Administrator',
      status: 'active',
      roleNames: ['hospital_admin'],
      permissions: defaultRolePermissions.hospital_admin,
      passwordHash,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    users.set(user.id, user);
    return toPublicUser(user);
  };

  await ensureBootstrapAdmin();

  return {
    ensureBootstrapAdmin,
    async createUser(input) {
      const duplicate = getUserByIdOrEmail(input.email);
      if (duplicate) {
        return toPublicUser(duplicate);
      }

      const timestamp = nowIso();
      const user: UserRecord = {
        id: randomUUID(),
        email: input.email,
        displayName: input.displayName,
        status: input.status,
        roleNames: [],
        permissions: [],
        passwordHash: await bcrypt.hash(input.password, 10),
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      users.set(user.id, user);
      return toPublicUser(user);
    },
    async updateUser(userId, input) {
      const user = getUserByIdOrEmail(userId);
      if (!user) return undefined;

      user.displayName = input.displayName ?? user.displayName;
      user.status = input.status ?? user.status;
      user.updatedAt = nowIso();
      return toPublicUser(user);
    },
    async assignUserRoles(userId, assignedRoleNames) {
      const user = getUserByIdOrEmail(userId);
      if (!user) return undefined;

      user.roleNames = assignedRoleNames;
      user.permissions = [
        ...new Set(assignedRoleNames.flatMap((roleName) => roles.get(roleName)?.permissions ?? [])),
      ];
      user.updatedAt = nowIso();
      return toPublicUser(user);
    },
    async listUsers() {
      return [...users.values()].map(toPublicUser).sort((a, b) => a.email.localeCompare(b.email));
    },
    async findSessionUser(email, password) {
      const user = getUserByIdOrEmail(email);
      if (!user || user.status !== 'active') return undefined;
      if (!(await bcrypt.compare(password, user.passwordHash))) return undefined;

      return {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        permissions: user.permissions,
      };
    },
    async listRoles() {
      return [...roles.values()];
    },
    async createRole(input) {
      const role = roles.get(input.name);
      if (role) {
        return role;
      }
      const createdRole: Role = {
        id: randomUUID(),
        name: input.name,
        description: input.description,
        permissions: [],
        createdAt: nowIso(),
      };
      roles.set(createdRole.name, createdRole);
      return createdRole;
    },
    async assignRolePermissions(roleId, assignedPermissions) {
      const role =
        [...roles.values()].find(
          (candidate) => candidate.id === roleId || candidate.name === roleId,
        ) ?? undefined;
      if (!role) return undefined;
      role.permissions = assignedPermissions;

      for (const user of users.values()) {
        if (user.roleNames.includes(role.name)) {
          user.permissions = [
            ...new Set(
              user.roleNames.flatMap((roleName) => roles.get(roleName)?.permissions ?? []),
            ),
          ];
          user.updatedAt = nowIso();
        }
      }

      return role;
    },
    async listPermissions() {
      return [...permissions.values()];
    },
  };
}

export async function createDatabaseAdminStore(
  database: Database,
  config: Partial<AppConfig>,
): Promise<AdminStore> {
  const mapUser = (row: {
    id: string;
    email: string;
    display_name: string;
    status: UserStatus;
    role_names: RoleName[] | null;
    permissions: PermissionAction[] | null;
    created_at: Date;
    updated_at: Date;
  }): User => ({
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    status: row.status,
    roleNames: row.role_names ?? [],
    permissions: row.permissions ?? [],
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  });

  const getUser = async (userId: string) => {
    const result = await database.query<{
      id: string;
      email: string;
      display_name: string;
      status: UserStatus;
      role_names: RoleName[] | null;
      permissions: PermissionAction[] | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `
        SELECT u.id, u.email, u.display_name, u.status, u.created_at, u.updated_at,
          COALESCE(array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS role_names,
          COALESCE(array_agg(DISTINCT p.action) FILTER (WHERE p.action IS NOT NULL), '{}') AS permissions
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        LEFT JOIN role_permissions rp ON rp.role_id = r.id
        LEFT JOIN permissions p ON p.id = rp.permission_id
        WHERE u.id::text = $1 OR lower(u.email) = lower($1)
        GROUP BY u.id;
      `,
      [userId],
    );
    const [row] = result.rows;
    return row ? mapUser(row) : undefined;
  };

  const upsertBootstrapRoles = async () => {
    for (const roleName of roleNames) {
      await database.query(
        `
          INSERT INTO roles (id, name, description)
          VALUES ($1, $2, $3)
          ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;
        `,
        [
          `10000000-0000-4000-8000-${String(roleNames.indexOf(roleName) + 1).padStart(12, '0')}`,
          roleName,
          roleDescriptions[roleName],
        ],
      );
    }

    for (const action of permissionActions) {
      await database.query(
        `
          INSERT INTO permissions (id, action, description)
          VALUES ($1, $2, $3)
          ON CONFLICT (action) DO UPDATE SET description = EXCLUDED.description;
        `,
        [
          `20000000-0000-4000-8000-${String(permissionActions.indexOf(action) + 1).padStart(12, '0')}`,
          action,
          action,
        ],
      );
    }
  };

  const ensureBootstrapAdmin = async () => {
    await upsertBootstrapRoles();

    const email = config.adminBootstrapEmail ?? 'admin@matria.local';
    const password = config.adminBootstrapPassword ?? 'development-password';
    const passwordHash = await bcrypt.hash(password, 10);
    await database.query(
      `
        INSERT INTO users (id, email, display_name, password_hash, status)
        VALUES ($1, $2, $3, $4, 'active')
        ON CONFLICT (email) DO UPDATE
        SET display_name = EXCLUDED.display_name,
          password_hash = EXCLUDED.password_hash,
          status = 'active',
          updated_at = now();
      `,
      ['343f9737-e017-469d-af7e-78cdd15a459f', email, 'Bootstrap Administrator', passwordHash],
    );
    await database.query(
      `
        INSERT INTO user_roles (user_id, role_id)
        SELECT u.id, r.id
        FROM users u, roles r
        WHERE lower(u.email) = lower($1) AND r.name = 'hospital_admin'
        ON CONFLICT DO NOTHING;
      `,
      [email],
    );

    const user = await getUser(email);
    if (!user) {
      throw new Error('Bootstrap admin could not be created.');
    }
    return user;
  };

  const listDatabaseRoles = async (): Promise<Role[]> => {
    const result = await database.query<{
      id: string;
      name: RoleName;
      description?: string;
      permissions: PermissionAction[] | null;
      created_at: Date;
    }>(`
      SELECT r.id, r.name, r.description, r.created_at,
        COALESCE(array_agg(DISTINCT p.action) FILTER (WHERE p.action IS NOT NULL), '{}') AS permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
      GROUP BY r.id
      ORDER BY r.name ASC;
    `);
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      permissions: row.permissions ?? [],
      createdAt: row.created_at.toISOString(),
    }));
  };

  return {
    ensureBootstrapAdmin,
    async createUser(input) {
      await database.query(
        `
          INSERT INTO users (id, email, display_name, password_hash, status)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (email) DO UPDATE
          SET display_name = EXCLUDED.display_name,
            status = EXCLUDED.status,
            updated_at = now();
        `,
        [
          randomUUID(),
          input.email,
          input.displayName,
          await bcrypt.hash(input.password, 10),
          input.status,
        ],
      );
      const user = await getUser(input.email);
      if (!user) throw new Error('Created user could not be loaded.');
      return user;
    },
    async updateUser(userId, input) {
      await database.query(
        `
          UPDATE users
          SET display_name = COALESCE($2, display_name),
            status = COALESCE($3, status),
            updated_at = now()
          WHERE id::text = $1 OR lower(email) = lower($1);
        `,
        [userId, input.displayName, input.status],
      );
      return getUser(userId);
    },
    async assignUserRoles(userId, assignedRoleNames) {
      const user = await getUser(userId);
      if (!user) return undefined;

      await database.query('DELETE FROM user_roles WHERE user_id = $1;', [user.id]);
      for (const roleName of assignedRoleNames) {
        await database.query(
          `
            INSERT INTO user_roles (user_id, role_id)
            SELECT $1, id FROM roles WHERE name = $2
            ON CONFLICT DO NOTHING;
          `,
          [user.id, roleName],
        );
      }
      await database.query('UPDATE users SET updated_at = now() WHERE id = $1;', [user.id]);
      return getUser(user.id);
    },
    async listUsers() {
      const result = await database.query<{
        id: string;
        email: string;
        display_name: string;
        status: UserStatus;
        role_names: RoleName[] | null;
        permissions: PermissionAction[] | null;
        created_at: Date;
        updated_at: Date;
      }>(`
        SELECT u.id, u.email, u.display_name, u.status, u.created_at, u.updated_at,
          COALESCE(array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS role_names,
          COALESCE(array_agg(DISTINCT p.action) FILTER (WHERE p.action IS NOT NULL), '{}') AS permissions
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        LEFT JOIN role_permissions rp ON rp.role_id = r.id
        LEFT JOIN permissions p ON p.id = rp.permission_id
        GROUP BY u.id
        ORDER BY u.email ASC;
      `);
      return result.rows.map(mapUser);
    },
    async findSessionUser(email, password) {
      const result = await database.query<{
        id: string;
        email: string;
        display_name: string;
        password_hash: string;
        status: UserStatus;
      }>(
        'SELECT id, email, display_name, password_hash, status FROM users WHERE lower(email) = lower($1);',
        [email],
      );
      const [user] = result.rows;
      if (!user || user.status !== 'active') return undefined;
      if (!(await bcrypt.compare(password, user.password_hash))) return undefined;
      const sessionUser = await getUser(user.id);
      if (!sessionUser) return undefined;
      return {
        id: sessionUser.id,
        email: sessionUser.email,
        displayName: sessionUser.displayName,
        permissions: sessionUser.permissions,
      };
    },
    async listRoles() {
      return listDatabaseRoles();
    },
    async createRole(input) {
      await database.query(
        `
          INSERT INTO roles (id, name, description)
          VALUES ($1, $2, $3)
          ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;
        `,
        [randomUUID(), input.name, input.description],
      );
      const role = (await listDatabaseRoles()).find((candidate) => candidate.name === input.name);
      if (!role) throw new Error('Created role could not be loaded.');
      return role;
    },
    async assignRolePermissions(roleId, assignedPermissions) {
      const role = (await listDatabaseRoles()).find(
        (candidate) => candidate.id === roleId || candidate.name === roleId,
      );
      if (!role) return undefined;

      await database.query('DELETE FROM role_permissions WHERE role_id = $1;', [role.id]);
      for (const permission of assignedPermissions) {
        await database.query(
          `
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT $1, id FROM permissions WHERE action = $2
            ON CONFLICT DO NOTHING;
          `,
          [role.id, permission],
        );
      }
      return (await listDatabaseRoles()).find((candidate) => candidate.id === role.id);
    },
    async listPermissions() {
      const result = await database.query<{
        id: string;
        action: PermissionAction;
        description?: string;
        created_at: Date;
      }>('SELECT id, action, description, created_at FROM permissions ORDER BY action ASC;');

      return result.rows.map((row) => ({
        id: row.id,
        action: row.action,
        description: row.description,
        createdAt: row.created_at.toISOString(),
      }));
    },
  };
}
