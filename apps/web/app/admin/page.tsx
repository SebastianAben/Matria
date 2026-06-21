"use client";

import { FormEvent, useEffect, useState } from "react";
import { roleKeys } from "@matria/shared";
import { apiRequest } from "../../lib/api";

type UserRow = {
  id: string;
  email: string;
  fullName: string;
  status: string;
  roles: string[];
};

type RoleRow = {
  key: string;
  name: string;
  permissions: string[];
};

export default function AdminPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [message, setMessage] = useState("");

  async function loadAdminData() {
    const [usersResponse, rolesResponse] = await Promise.all([
      apiRequest<{ users: UserRow[] }>("/admin/users"),
      apiRequest<{ roles: RoleRow[] }>("/admin/roles")
    ]);
    if (usersResponse.success) setUsers(usersResponse.data.users);
    if (rolesResponse.success) setRoles(rolesResponse.data.roles);
    if (!usersResponse.success) setMessage(usersResponse.error.message);
    else if (!rolesResponse.success) setMessage(rolesResponse.error.message);
    else setMessage("Admin data loaded.");
  }

  useEffect(() => {
    void loadAdminData();
  }, []);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await apiRequest("/admin/users", {
      method: "POST",
      body: JSON.stringify({
        email: form.get("email"),
        fullName: form.get("fullName"),
        password: form.get("password"),
        roleKeys: [form.get("roleKey")]
      })
    });
    if (response.success) {
      setMessage("User created.");
      await loadAdminData();
    } else {
      setMessage(response.error.message);
    }
  }

  return (
    <div className="grid">
      <div className="topbar">
        <div>
          <h1 className="page-title">Administration</h1>
          <p className="muted">Manage first-release users, roles, and permissions.</p>
        </div>
        <span className="status">{users.length} users</span>
      </div>
      {message ? <p className="panel">{message}</p> : null}
      <div className="grid two-col">
        <section className="panel">
          <h2>Create User</h2>
          <form className="form-grid" onSubmit={createUser}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" required />
            </div>
            <div className="field">
              <label htmlFor="fullName">Full name</label>
              <input id="fullName" name="fullName" required />
            </div>
            <div className="field">
              <label htmlFor="password">Temporary password</label>
              <input id="password" name="password" type="password" required minLength={8} />
            </div>
            <div className="field">
              <label htmlFor="roleKey">Role</label>
              <select id="roleKey" name="roleKey">
                {roleKeys.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            <button className="button" type="submit">
              Create user
            </button>
          </form>
        </section>
        <section className="panel">
          <h2>Users</h2>
          <div className="record-list">
            {users.map((user) => (
              <div className="record" key={user.id}>
                <strong>{user.fullName}</strong>
                <span className="muted">{user.email}</span>
                <p className="muted">{user.roles.join(", ") || "No roles"}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="panel">
        <h2>Roles</h2>
        <div className="summary-grid">
          {roles.map((role) => (
            <div className="record" key={role.key}>
              <strong>{role.name}</strong>
              <p className="muted">{role.permissions.length} permissions</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
