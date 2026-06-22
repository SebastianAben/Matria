"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Save, Settings, ShieldCheck } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { initials, type AdminRole, type AdminUser } from "../../lib/clinical-api";
import {
  ActionButton,
  Badge,
  DataTable,
  EmptyState,
  Field,
  KeyValueList,
  PageHeader,
  Panel
} from "../components/clinical-ui";

type HealthResponse = {
  services: Array<{ name: string; status: string; uptimePercent: number }>;
  updatedAt: string;
};

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Manage backend users, roles, permissions, and operational readiness.");

  useEffect(() => {
    void loadAdmin();
  }, []);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? users[0] ?? null,
    [selectedUserId, users]
  );

  async function loadAdmin() {
    setLoading(true);
    const [usersResponse, rolesResponse, healthResponse] = await Promise.all([
      apiRequest<{ users: AdminUser[] }>("/admin/users"),
      apiRequest<{ roles: AdminRole[] }>("/admin/roles"),
      apiRequest<HealthResponse>("/admin/system-health")
    ]);
    if (!usersResponse.success) {
      setMessage(usersResponse.error.message);
      setLoading(false);
      return;
    }
    setUsers(usersResponse.data.users);
    setSelectedUserId((current) => current || usersResponse.data.users[0]?.id || "");
    setRoles(rolesResponse.success ? rolesResponse.data.roles : []);
    setHealth(healthResponse.success ? healthResponse.data : null);
    setMessage("Backend administration data loaded.");
    setLoading(false);
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await apiRequest<{ user: AdminUser }>("/admin/users", {
      method: "POST",
      body: JSON.stringify({
        email: String(form.get("email") ?? "").trim(),
        fullName: String(form.get("fullName") ?? "").trim(),
        password: String(form.get("password") ?? ""),
        roleKeys: [String(form.get("role"))]
      })
    });
    if (!response.success) {
      setMessage(response.error.message);
      return;
    }
    setMessage(`User ${response.data.user.email} created.`);
    event.currentTarget.reset();
    await loadAdmin();
    setSelectedUserId(response.data.user.id);
  }

  async function updateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUser) return;
    const form = new FormData(event.currentTarget);
    const response = await apiRequest<{ user: AdminUser }>(`/admin/users/${selectedUser.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        fullName: String(form.get("fullName") ?? "").trim(),
        status: String(form.get("status") ?? "active"),
        roleKeys: [String(form.get("role"))]
      })
    });
    setMessage(response.success ? "User profile and roles updated." : response.error.message);
    if (response.success) await loadAdmin();
  }

  if (loading) {
    return (
      <main className="screen">
        <EmptyState title="Loading admin" description="Users, roles, and system health are loading from the backend." action={<Loader2 size={20} />} />
      </main>
    );
  }

  return (
    <main className="screen">
      <PageHeader
        eyebrow="Administration"
        title="Admin / Role Management"
        description={message}
        actions={
          <>
            <ActionButton tone="secondary">
              <ShieldCheck size={15} />
              Permissions
            </ActionButton>
            <ActionButton tone="secondary" onClick={loadAdmin}>
              <Settings size={15} />
              Refresh
            </ActionButton>
          </>
        }
      />

      <div className="clinical-grid">
        <div className="clinical-grid grid-main-aside">
          <div className="clinical-grid">
            <Panel title="Role Overview" subtitle="Backend roles and permission counts.">
              {roles.length === 0 ? (
                <EmptyState title="No roles loaded" description="Role data is unavailable for this account or request." />
              ) : (
                <div className="mini-card-grid">
                  {roles.map((role) => (
                    <div className="role-card mini-card" key={role.key}>
                      <strong>{role.name}</strong>
                      <p>{role.permissions.length} permission(s)</p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Users" subtitle="Backend account list. Select a user to inspect or update.">
              {users.length === 0 ? (
                <EmptyState title="No users" description="Create a backend user before assigning clinical work." />
              ) : (
                <DataTable
                  columns={["", "Name", "Email", "Roles", "Status"]}
                  rows={users.map((user) => [
                    <span key={`${user.id}-avatar`} className="avatar">{initials(user.fullName)}</span>,
                    <button key={user.id} type="button" className="action-button ghost" onClick={() => setSelectedUserId(user.id)}>
                      {user.fullName}
                    </button>,
                    user.email,
                    user.roles.join(", ") || "-",
                    <Badge key={`${user.id}-status`} tone={user.status === "active" ? "green" : "gray"}>{user.status}</Badge>
                  ])}
                />
              )}
            </Panel>

            <Panel title="Permissions Matrix">
              {roles.length === 0 ? (
                <EmptyState title="No permissions" description="Permissions load from backend roles." />
              ) : (
                <DataTable
                  columns={["Role", "Description", "Permissions"]}
                  rows={roles.map((role) => [
                    role.name,
                    role.description ?? "-",
                    role.permissions.join(", ")
                  ])}
                />
              )}
            </Panel>
          </div>

          <div className="clinical-grid">
            <Panel title="Create User" subtitle="Creates a backend user with one initial role.">
              <form className="form-grid" onSubmit={createUser}>
                <Field label="Email">
                  <input name="email" type="email" required />
                </Field>
                <Field label="Full name">
                  <input name="fullName" required />
                </Field>
                <Field label="Temporary password">
                  <input name="password" type="password" minLength={8} required />
                </Field>
                <Field label="Initial role">
                  <select name="role" defaultValue="clinician">
                    {roles.map((role) => (
                      <option key={role.key} value={role.key}>{role.name}</option>
                    ))}
                  </select>
                </Field>
                <div className="wide">
                  <ActionButton type="submit">
                    <Plus size={15} />
                    Create user
                  </ActionButton>
                </div>
              </form>
            </Panel>

            <Panel title="Selected User">
              {selectedUser ? (
                <KeyValueList
                  items={[
                    ["Name", selectedUser.fullName],
                    ["Email", selectedUser.email],
                    ["Roles", selectedUser.roles.join(", ") || "-"],
                    ["Status", <Badge key="status" tone={selectedUser.status === "active" ? "green" : "gray"}>{selectedUser.status}</Badge>]
                  ]}
                />
              ) : (
                <EmptyState title="No user selected" description="Select a backend user from the table." />
              )}
            </Panel>

            <Panel title="Edit Access">
              {selectedUser ? (
                <form className="form-grid" key={selectedUser.id} onSubmit={updateUser}>
                  <Field label="Full name">
                    <input name="fullName" defaultValue={selectedUser.fullName} />
                  </Field>
                  <Field label="Status">
                    <select name="status" defaultValue={selectedUser.status}>
                      <option value="active">Active</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </Field>
                  <Field label="Primary role">
                    <select name="role" defaultValue={selectedUser.roles[0] ?? "clinician"}>
                      {roles.map((role) => (
                        <option key={role.key} value={role.key}>{role.name}</option>
                      ))}
                    </select>
                  </Field>
                  <div className="wide button-cluster">
                    <ActionButton type="submit">
                      <Save size={15} />
                      Save changes
                    </ActionButton>
                  </div>
                </form>
              ) : (
                <EmptyState title="No user selected" description="Select a backend user before editing." />
              )}
            </Panel>

            <Panel title="System Health">
              {health ? (
                <div className="state-stack">
                  {health.services.map((service) => (
                    <div className="state-card" key={service.name}>
                      <div className="button-cluster">
                        <strong>{service.name}</strong>
                        <Badge tone={service.status === "operational" ? "green" : "amber"}>{service.status}</Badge>
                      </div>
                      <p>{service.uptimePercent}% uptime · backend health endpoint</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="Health unavailable" description="This account may not have system configuration access." />
              )}
            </Panel>
          </div>
        </div>
      </div>
    </main>
  );
}
