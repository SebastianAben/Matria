"use client";

import { FormEvent, useEffect, useState } from "react";
import { Download, Filter, Loader2, Search } from "lucide-react";
import { apiRequest } from "../../lib/api";
import {
  formatDateTime,
  formatJsonPreview,
  type AuditLog,
  type WorkspaceState
} from "../../lib/clinical-api";
import {
  ActionButton,
  Badge,
  DataTable,
  EmptyState,
  Field,
  KeyValueList,
  PageHeader,
  Panel,
  PatientContextBar,
  Timeline
} from "../components/clinical-ui";

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [selectedLogId, setSelectedLogId] = useState("");
  const [workspace, setWorkspace] = useState<WorkspaceState | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Read-only audit review loaded from the backend.");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    void loadAudit(params);
    const encounterId = params.get("encounterId");
    if (encounterId) {
      void apiRequest<WorkspaceState>(`/encounters/${encounterId}/workspace-state`).then((response) => {
        if (response.success) setWorkspace(response.data);
      });
    }
  }, []);

  async function loadAudit(params: URLSearchParams) {
    setLoading(true);
    const query = new URLSearchParams();
    for (const key of ["actorId", "action", "targetType", "targetId", "outcome", "requestId", "from", "to"]) {
      const value = params.get(key);
      if (value) query.set(key, value);
    }
    const response = await apiRequest<{ auditLogs: AuditLog[] }>(
      `/audit-logs${query.toString() ? `?${query.toString()}` : ""}`
    );
    if (!response.success) {
      setMessage(response.error.message);
      setLoading(false);
      return;
    }
    setLogs(response.data.auditLogs);
    setSelectedLogId(response.data.auditLogs[0]?.id ?? "");
    setMessage(`${response.data.auditLogs.length} backend audit event(s) loaded.`);
    setLoading(false);
  }

  async function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const key of ["action", "targetType", "targetId", "outcome", "requestId"]) {
      const value = String(form.get(key) ?? "").trim();
      if (value) params.set(key, value);
    }
    window.history.replaceState(null, "", params.toString() ? `/audit?${params}` : "/audit");
    await loadAudit(params);
  }

  const selected = logs.find((log) => log.id === selectedLogId) ?? logs[0] ?? null;
  const successCount = logs.filter((log) => log.outcome === "success").length;
  const failureCount = logs.filter((log) => log.outcome !== "success").length;

  return (
    <main className="screen">
      <PageHeader
        eyebrow="Governance"
        title="Audit / Encounter Audit Trail"
        description={message}
        actions={
          <>
            <ActionButton tone="secondary">
              <Download size={15} />
              Export CSV
            </ActionButton>
            <ActionButton onClick={() => loadAudit(new URLSearchParams(window.location.search))}>
              <Filter size={15} />
              Refresh
            </ActionButton>
          </>
        }
      />

      <div className="clinical-grid">
        {workspace ? (
          <PatientContextBar
            mode="audit"
            patient={workspace.encounter.patient}
            pregnancyEpisode={workspace.encounter.pregnancyEpisode}
            encounter={workspace.encounter}
          />
        ) : null}

        <Panel title="Audit Filters" subtitle="Filter backend audit logs by action, target, outcome, or request ID.">
          <form className="filters-row" onSubmit={applyFilters}>
            <Field label="Action">
              <input name="action" placeholder="generated_output.approve" />
            </Field>
            <Field label="Target type">
              <input name="targetType" placeholder="encounter" />
            </Field>
            <Field label="Target ID">
              <input name="targetId" />
            </Field>
            <Field label="Outcome">
              <select name="outcome" defaultValue="">
                <option value="">All outcomes</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
                <option value="denied">Denied</option>
              </select>
            </Field>
            <Field label="Request ID">
              <input name="requestId" />
            </Field>
            <ActionButton type="submit">
              <Search size={15} />
              Search
            </ActionButton>
          </form>
        </Panel>

        <div className="clinical-grid grid-main-aside">
          <div className="clinical-grid">
            <Panel title="Audit Events" subtitle="Only persisted backend events are shown.">
              {loading ? (
                <EmptyState title="Loading audit" description="Audit events are loading from the API." action={<Loader2 size={20} />} />
              ) : logs.length === 0 ? (
                <EmptyState title="No audit events" description="No backend events matched the current filters." />
              ) : (
                <DataTable
                  columns={["Timestamp", "Actor", "Action", "Target", "Outcome", "Request ID"]}
                  rows={logs.map((log) => [
                    <button key={log.id} type="button" className="action-button ghost" onClick={() => setSelectedLogId(log.id)}>
                      {formatDateTime(log.createdAt)}
                    </button>,
                    log.actor?.fullName ?? log.actor?.email ?? log.actorId ?? "System",
                    log.action,
                    `${log.targetType}${log.targetId ? ` · ${log.targetId}` : ""}`,
                    <Badge key={`${log.id}-outcome`} tone={log.outcome === "success" ? "green" : log.outcome === "denied" ? "red" : "amber"}>{log.outcome}</Badge>,
                    log.requestId
                  ])}
                />
              )}
            </Panel>

            <Panel title="Outcome Summary">
              <div className="stat-row">
                <div className="stat-tile">
                  <span>Total events</span>
                  <strong>{logs.length}</strong>
                  <small>Current filter</small>
                </div>
                <div className="stat-tile">
                  <span>Success</span>
                  <strong>{successCount}</strong>
                  <small>Persisted writes/reads</small>
                </div>
                <div className="stat-tile">
                  <span>Failure/denied</span>
                  <strong>{failureCount}</strong>
                  <small>Backend outcomes</small>
                </div>
                <div className="stat-tile">
                  <span>Encounter</span>
                  <strong>{workspace ? "Scoped" : "Global"}</strong>
                  <small>Current view</small>
                </div>
              </div>
            </Panel>
          </div>

          <div className="clinical-grid">
            <Panel title="Event Detail">
              {selected ? (
                <KeyValueList
                  items={[
                    ["Timestamp", formatDateTime(selected.createdAt)],
                    ["Actor", selected.actor?.fullName ?? selected.actor?.email ?? selected.actorId ?? "System"],
                    ["Action", selected.action],
                    ["Target", `${selected.targetType}${selected.targetId ? ` · ${selected.targetId}` : ""}`],
                    ["Outcome", <Badge key="outcome" tone={selected.outcome === "success" ? "green" : selected.outcome === "denied" ? "red" : "amber"}>{selected.outcome}</Badge>],
                    ["Request ID", selected.requestId],
                    ["Metadata", formatJsonPreview(selected.metadata)]
                  ]}
                />
              ) : (
                <EmptyState title="No event selected" description="Select an audit event from the backend results." />
              )}
            </Panel>

            <Panel title="Audit Narrative">
              {selected ? (
                <div className="note-box">
                  <h3>{selected.action}</h3>
                  <p>{selected.targetType} {selected.targetId ?? ""} recorded with outcome {selected.outcome}.</p>
                </div>
              ) : (
                <EmptyState title="No narrative" description="An event narrative appears after selecting an audit row." />
              )}
            </Panel>

            <Panel title="Timeline">
              {logs.length === 0 ? (
                <EmptyState title="No timeline" description="Backend audit events appear here in chronological order." />
              ) : (
                <Timeline
                  items={logs.slice(0, 8).map((log) => [
                    formatDateTime(log.createdAt),
                    `${log.action} · ${log.outcome}`,
                    log.actor?.fullName ?? log.actor?.email ?? "System"
                  ])}
                />
              )}
            </Panel>
          </div>
        </div>
      </div>
    </main>
  );
}
