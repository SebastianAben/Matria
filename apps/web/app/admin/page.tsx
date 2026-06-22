"use client";

import { FormEvent, useState } from "react";
import { Download, Plus, Save, Settings, ShieldCheck } from "lucide-react";
import { apiRequest } from "../../lib/api";
import {
  ActionButton,
  Badge,
  DataTable,
  Field,
  KeyValueList,
  PageHeader,
  Panel
} from "../components/clinical-ui";
import { roles, users } from "../components/demo-data";

export default function AdminPage() {
  const fallbackUser: [string, string, string, string, string, string] = [
    "HK",
    "Dr. Hana Kusuma",
    "hana.kusuma@rsia-melati.co.id",
    "Hospital Admin, Clinician",
    "Active",
    "Today, 10:15"
  ];
  const [selectedUser, setSelectedUser] = useState(users[0] ?? fallbackUser);
  const [message, setMessage] = useState("Manage users, roles, permissions, and operational readiness.");

  async function updateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const userId = new URLSearchParams(window.location.search).get("userId");
    if (!userId) {
      setMessage("Demo user updated locally. Add a userId query parameter to patch a live user.");
      return;
    }
    const response = await apiRequest(`/admin/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({
        fullName: String(form.get("fullName") ?? ""),
        status: String(form.get("status") ?? "active"),
        roleKeys: [String(form.get("role") ?? "clinician")]
      })
    });
    setMessage(response.success ? "User profile and roles updated." : response.error.message);
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
            <ActionButton>
              <Plus size={15} />
              Invite user
            </ActionButton>
          </>
        }
      />

      <div className="clinical-grid">
        <div className="alert-strip">
          <div className="alert-card">
            <span>User created successfully. Temporary password has been emailed to dr.sari@rsia-melati.co.id</span>
            <strong>View user</strong>
          </div>
          <div className="alert-card warning">
            <span>User disabled. They will no longer be able to sign in.</span>
            <strong>View user</strong>
          </div>
          <div className="button-cluster">
            <ActionButton><Plus size={15} />Create User</ActionButton>
            <ActionButton tone="ghost"><Download size={15} />Export Users</ActionButton>
            <ActionButton tone="ghost"><Settings size={15} />System Configuration</ActionButton>
          </div>
        </div>

        <div className="clinical-grid grid-main-aside">
          <div className="clinical-grid">
            <Panel title="Role Overview" subtitle="Role cards mirror the reference management summary.">
              <div className="mini-card-grid">
                {roles.map(([role, count]) => (
                  <div className="role-card mini-card" key={role}>
                    <strong>{role}</strong>
                    <p>{count}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Users" subtitle="Select a user to inspect profile, roles, and access scope.">
              <DataTable
                columns={["", "Name", "Email", "Roles", "Status", "Last active"]}
                rows={users}
                renderCell={(cell, index, rowIndex) => {
                  if (index === 0) return <span className="avatar">{cell}</span>;
                  if (index === 4) return <Badge tone={cell === "Active" ? "green" : "gray"}>{cell}</Badge>;
                  if (index === 1) {
                    return (
                      <button type="button" className="action-button ghost" onClick={() => setSelectedUser(users[rowIndex] ?? fallbackUser)}>
                        {cell}
                      </button>
                    );
                  }
                  return cell;
                }}
              />
            </Panel>

            <Panel title="Permissions Matrix">
              <DataTable
                columns={["Capability", "Clinician", "Nurse", "Lab", "Admin", "Auditor"]}
                rows={[
                  ["Patient search", "Allowed", "Allowed", "Limited", "Allowed", "Read only"],
                  ["Ambient capture", "Allowed", "Allowed", "No", "Allowed", "No"],
                  ["Approve outputs", "Allowed", "Denied", "Denied", "Allowed", "Denied"],
                  ["Audit logs", "Limited", "No", "No", "Allowed", "Allowed"],
                  ["System health", "No", "No", "No", "Allowed", "No"]
                ]}
                renderCell={(cell, index) => index > 0 ? <Badge tone={cell === "Allowed" ? "green" : cell === "Denied" || cell === "No" ? "red" : "amber"}>{cell}</Badge> : cell}
              />
            </Panel>
          </div>

          <div className="clinical-grid">
            <Panel title="Selected User">
              <KeyValueList
                items={[
                  ["Initials", selectedUser[0]],
                  ["Name", selectedUser[1]],
                  ["Email", selectedUser[2]],
                  ["Roles", selectedUser[3]],
                  ["Status", <Badge tone={selectedUser[4] === "Active" ? "green" : "gray"}>{selectedUser[4]}</Badge>],
                  ["Last active", selectedUser[5]]
                ]}
              />
            </Panel>

            <Panel title="Edit Access">
              <form className="form-grid" onSubmit={updateUser}>
                <Field label="Full name">
                  <input name="fullName" defaultValue={selectedUser[1]} />
                </Field>
                <Field label="Status">
                  <select name="status" defaultValue={selectedUser[4] === "Active" ? "active" : "inactive"}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </Field>
                <Field label="Primary role">
                  <select name="role" defaultValue="clinician">
                    <option value="clinician">Clinician</option>
                    <option value="nurse">Nurse / Midwife</option>
                    <option value="lab_staff">Lab Staff</option>
                    <option value="hospital_admin">Hospital Admin</option>
                    <option value="auditor">Auditor</option>
                  </select>
                </Field>
                <Field label="Approval access">
                  <select defaultValue="allowed">
                    <option value="allowed">Clinician approval enabled</option>
                    <option value="denied">Approval denied</option>
                  </select>
                </Field>
                <div className="wide button-cluster">
                  <ActionButton type="submit">
                    <Save size={15} />
                    Save changes
                  </ActionButton>
                  <ActionButton type="button" tone="ghost">
                    Reset
                  </ActionButton>
                </div>
              </form>
            </Panel>

            <Panel title="System Health">
              <div className="state-stack">
                <div className="state-card">
                  <div className="button-cluster">
                    <strong>API readiness</strong>
                    <Badge tone="green">Healthy</Badge>
                  </div>
                  <p>Readiness, database, and service checks are summarized for administrators.</p>
                </div>
                <div className="state-card">
                  <div className="button-cluster">
                    <strong>AI synthesis</strong>
                    <Badge tone="green">Available</Badge>
                  </div>
                  <p>Generated outputs require clinician approval before reuse.</p>
                </div>
                <div className="state-card">
                  <div className="button-cluster">
                    <strong>Audit pipeline</strong>
                    <Badge tone="green">Recording</Badge>
                  </div>
                  <p>Approval, rejection, and uncertainty decisions are retained.</p>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </main>
  );
}
