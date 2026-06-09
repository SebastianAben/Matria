'use client';

import type { AuditLog, PermissionAction, Role, SessionUser, User } from '@matria/contracts';
import { useEffect, useMemo, useState } from 'react';

import { matriaApi } from '../../lib/api-client';

type AdminTab = 'users' | 'roles' | 'audit';

type AdminState = {
  user?: SessionUser;
  users: User[];
  roles: Role[];
  auditLogs: AuditLog[];
};

const initialState: AdminState = {
  users: [],
  roles: [],
  auditLogs: [],
};

export function AdminConsole() {
  const [state, setState] = useState<AdminState>(initialState);
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [message, setMessage] = useState('Admin session has not been loaded.');
  const [newUserEmail, setNewUserEmail] = useState('phase7-auditor@matria.local');
  const [newUserName, setNewUserName] = useState('Phase 7 Auditor');
  const [newUserPassword, setNewUserPassword] = useState('development-password');
  const [assignmentUserId, setAssignmentUserId] = useState('');
  const [assignmentRole, setAssignmentRole] = useState('auditor');

  const canAdminUsers = state.user?.permissions.includes('user:admin') ?? false;
  const canReadAudit = state.user?.permissions.includes('audit:read') ?? false;
  const canUseAdmin = canAdminUsers || canReadAudit;

  const selectedAssignmentUser = useMemo(
    () => state.users.find((user) => user.id === assignmentUserId),
    [assignmentUserId, state.users],
  );

  async function loadAdminData(user = state.user) {
    const [users, roles, auditLogs] = await Promise.all([
      canAdminUsers || user?.permissions.includes('user:admin')
        ? matriaApi.listUsers().then((response) => response.data)
        : Promise.resolve([]),
      canAdminUsers || user?.permissions.includes('user:admin')
        ? matriaApi.listRoles().then((response) => response.data)
        : Promise.resolve([]),
      canReadAudit || user?.permissions.includes('audit:read')
        ? matriaApi.listAuditLogs().then((response) => response.data)
        : Promise.resolve([]),
    ]);

    setState((current) => {
      const nextUsers = users.length ? users : current.users;
      return {
        ...current,
        users: nextUsers,
        roles: roles.length ? roles : current.roles,
        auditLogs: auditLogs.length ? auditLogs : current.auditLogs,
      };
    });

    if (!assignmentUserId && users[0]) {
      setAssignmentUserId(users[0].id);
    }
  }

  async function refreshSession() {
    const session = await matriaApi.getSession();
    if (!session.user) {
      setState(initialState);
      setMessage('Login is required for admin and audit surfaces.');
      return;
    }
    const user = session.user;

    setState((current) => ({ ...current, user }));
    if (!user.permissions.includes('user:admin') && !user.permissions.includes('audit:read')) {
      setMessage('Current user is not authorized for admin surfaces.');
      return;
    }

    if (!user.permissions.includes('user:admin')) {
      setActiveTab('audit');
    }

    await loadAdminData(user);
    setMessage('Admin console loaded.');
  }

  async function login() {
    const session = await matriaApi.login();
    if (!session.user) {
      setMessage('Bootstrap login failed.');
      return;
    }
    const user = session.user;
    setState((current) => ({ ...current, user }));
    if (!user.permissions.includes('user:admin')) {
      setActiveTab('audit');
    }
    await loadAdminData(user);
    setMessage('Bootstrap admin session active.');
  }

  async function createUser() {
    const user = (
      await matriaApi.createUser({
        email: newUserEmail,
        displayName: newUserName,
        password: newUserPassword,
        status: 'active',
      })
    ).data;
    setAssignmentUserId(user.id);
    await loadAdminData();
    setMessage(`Created user ${user.email}.`);
  }

  async function assignRole() {
    if (!assignmentUserId) {
      setMessage('Select a user before assigning a role.');
      return;
    }

    const user = (
      await matriaApi.assignUserRoles(assignmentUserId, {
        roleNames: [assignmentRole as Role['name']],
      })
    ).data;
    await loadAdminData();
    setMessage(`Assigned ${assignmentRole} to ${user.email}.`);
  }

  async function toggleUser(user: User) {
    const updated = (
      await matriaApi.updateUser(user.id, {
        status: user.status === 'active' ? 'disabled' : 'active',
      })
    ).data;
    await loadAdminData();
    setMessage(`${updated.email} is now ${updated.status}.`);
  }

  async function assignRolePermissions(role: Role, permission: PermissionAction) {
    const permissions = role.permissions.includes(permission)
      ? role.permissions.filter((item) => item !== permission)
      : [...role.permissions, permission];
    await matriaApi.assignRolePermissions(role.id, { permissions });
    await loadAdminData();
    setMessage(`Updated permissions for ${role.name}.`);
  }

  useEffect(() => {
    refreshSession().catch((error) => {
      setMessage(error instanceof Error ? error.message : 'Admin session load failed.');
    });
  }, []);

  return (
    <main className="workspace adminWorkspace">
      <section className="statusBar" aria-label="Admin status">
        <div>
          <p className="eyebrow">Matria administration</p>
          <h1>Admin console</h1>
        </div>
        <span className="statusPill">RBAC protected</span>
      </section>

      <section className="commandBar" aria-label="Admin actions">
        <button onClick={login} type="button">
          Login as bootstrap admin
        </button>
        <button onClick={() => refreshSession()} type="button">
          Refresh
        </button>
      </section>

      <p className="message" role="status">
        {message}
      </p>

      <section className="panel sessionPanel" aria-label="Current admin session">
        <p className="sectionLabel">Session</p>
        <h2>{state.user?.displayName ?? 'Not authenticated'}</h2>
        <p>{state.user?.email ?? 'Login before accessing protected admin data.'}</p>
        {state.user ? <p className="permissionLine">{state.user.permissions.join(' | ')}</p> : null}
      </section>

      {!state.user ? null : canUseAdmin ? (
        <>
          <div className="tabRow adminTabs" role="tablist" aria-label="Admin sections">
            <button
              aria-selected={activeTab === 'users'}
              disabled={!canAdminUsers}
              onClick={() => setActiveTab('users')}
              role="tab"
              type="button"
            >
              Users
            </button>
            <button
              aria-selected={activeTab === 'roles'}
              disabled={!canAdminUsers}
              onClick={() => setActiveTab('roles')}
              role="tab"
              type="button"
            >
              Roles
            </button>
            <button
              aria-selected={activeTab === 'audit'}
              disabled={!canReadAudit}
              onClick={() => setActiveTab('audit')}
              role="tab"
              type="button"
            >
              Audit
            </button>
          </div>

          {activeTab === 'users' && canAdminUsers ? (
            <section className="workspaceGrid adminGrid" aria-label="User administration">
              <div className="panel">
                <p className="sectionLabel">Create user</p>
                <h2>Identity</h2>
                <label>
                  New user email
                  <input
                    aria-label="New user email"
                    onChange={(event) => setNewUserEmail(event.target.value)}
                    type="email"
                    value={newUserEmail}
                  />
                </label>
                <label>
                  New user display name
                  <input
                    aria-label="New user display name"
                    onChange={(event) => setNewUserName(event.target.value)}
                    value={newUserName}
                  />
                </label>
                <label>
                  Initial password
                  <input
                    aria-label="Initial password"
                    onChange={(event) => setNewUserPassword(event.target.value)}
                    type="password"
                    value={newUserPassword}
                  />
                </label>
                <button onClick={createUser} type="button">
                  Create user
                </button>
              </div>

              <div className="panel">
                <p className="sectionLabel">Assign role</p>
                <h2>Access</h2>
                <label>
                  Role assignment user
                  <select
                    aria-label="Role assignment user"
                    onChange={(event) => setAssignmentUserId(event.target.value)}
                    value={assignmentUserId}
                  >
                    {state.users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.displayName}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Role to assign
                  <select
                    aria-label="Role to assign"
                    onChange={(event) => setAssignmentRole(event.target.value)}
                    value={assignmentRole}
                  >
                    {state.roles.map((role) => (
                      <option key={role.id} value={role.name}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button onClick={assignRole} type="button">
                  Assign role
                </button>
                <p className="permissionLine">
                  Current permissions: {selectedAssignmentUser?.permissions.join(' | ') ?? 'none'}
                </p>
              </div>

              <div className="panel widePanel">
                <p className="sectionLabel">Users</p>
                <h2>Accounts</h2>
                <div className="adminTable">
                  {state.users.map((user) => (
                    <article key={user.id}>
                      <strong>{user.displayName}</strong>
                      <span>{user.email}</span>
                      <span>{user.status}</span>
                      <span>{user.roleNames.join(', ') || 'No roles'}</span>
                      <small>{user.permissions.join(' | ') || 'No permissions'}</small>
                      <button onClick={() => toggleUser(user)} type="button">
                        {user.status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {activeTab === 'roles' && canAdminUsers ? (
            <section className="panel" aria-label="Role administration">
              <p className="sectionLabel">Roles</p>
              <h2>Permission matrix</h2>
              <div className="roleMatrix">
                {state.roles.map((role) => (
                  <article key={role.id}>
                    <strong>{role.name}</strong>
                    <span>{role.description}</span>
                    <div>
                      {state.roles
                        .flatMap((item) => item.permissions)
                        .filter((permission, index, list) => list.indexOf(permission) === index)
                        .map((permission) => (
                          <label key={permission}>
                            <input
                              checked={role.permissions.includes(permission)}
                              onChange={() => assignRolePermissions(role, permission)}
                              type="checkbox"
                            />
                            {permission}
                          </label>
                        ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {activeTab === 'audit' && canReadAudit ? (
            <section className="panel" aria-label="Audit log viewer">
              <p className="sectionLabel">Audit</p>
              <h2>Recent events</h2>
              <div className="adminTable auditTable">
                {state.auditLogs.map((event) => (
                  <article key={event.id}>
                    <strong>{event.action}</strong>
                    <span>{event.resourceType}</span>
                    <span>{event.resourceId ?? 'No resource id'}</span>
                    <small>{event.createdAt}</small>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <section className="panel">
          <p className="sectionLabel">Unauthorized</p>
          <h2>Protected surface</h2>
          <p>This account does not have admin or audit permissions.</p>
        </section>
      )}
    </main>
  );
}
