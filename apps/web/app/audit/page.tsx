"use client";

import { useState } from "react";
import { Download, Filter, Search } from "lucide-react";
import {
  ActionButton,
  Badge,
  DataTable,
  Field,
  KeyValueList,
  PageHeader,
  Panel,
  PatientContextBar,
  Timeline
} from "../components/clinical-ui";
import { auditEvents } from "../components/demo-data";

export default function AuditPage() {
  const fallbackEvent: [string, string, string, string, string, string] = [
    "2025-05-08 10:15:22",
    "System (AI)",
    "AI Synthesis Call",
    "Session Note",
    "Success",
    "Generated updated session note from transcript and observations."
  ];
  const [selected, setSelected] = useState(auditEvents[0] ?? fallbackEvent);

  return (
    <main className="screen">
      <PageHeader
        eyebrow="Governance"
        title="Audit / Encounter Audit Trail"
        description="Read-only audit review across encounter, generated outputs, rule evaluations, and clinician decisions."
        actions={
          <>
            <ActionButton tone="secondary">
              <Download size={15} />
              Export CSV
            </ActionButton>
            <ActionButton>
              <Filter size={15} />
              Apply filters
            </ActionButton>
          </>
        }
      />

      <div className="clinical-grid">
        <PatientContextBar mode="audit" />

        <Panel title="Audit Filters" subtitle="Filter by date, actor, action, target, outcome, or trace ID.">
          <div className="filters-row">
            <Field label="Search">
              <input defaultValue="ANC 281904" />
            </Field>
            <Field label="Actor">
              <select defaultValue="all">
                <option value="all">All actors</option>
                <option value="clinician">Clinicians</option>
                <option value="system">System</option>
              </select>
            </Field>
            <Field label="Outcome">
              <select defaultValue="all">
                <option value="all">All outcomes</option>
                <option value="success">Success</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="denied">Denied</option>
              </select>
            </Field>
            <Field label="Trace ID">
              <input defaultValue="req_10-15-22" />
            </Field>
            <ActionButton>
              <Search size={15} />
              Search
            </ActionButton>
          </div>
        </Panel>

        <div className="clinical-grid grid-main-aside">
          <div className="clinical-grid">
            <Panel title="Audit Events" subtitle="Every review decision remains visible, including rejected outputs.">
              <DataTable
                columns={["Timestamp", "Actor", "Action", "Target", "Outcome", "Detail"]}
                rows={auditEvents}
                renderCell={(cell, index, rowIndex) => {
                  if (index === 0) {
                    return (
                      <button type="button" className="action-button ghost" onClick={() => setSelected(auditEvents[rowIndex] ?? fallbackEvent)}>
                        {cell}
                      </button>
                    );
                  }
                  if (index === 4) {
                    const tone = cell === "Success" ? "green" : cell === "Acknowledged" ? "blue" : "amber";
                    return <Badge tone={tone}>{cell}</Badge>;
                  }
                  return cell;
                }}
              />
            </Panel>

            <Panel title="Outcome Summary">
              <div className="stat-row">
                <div className="stat-tile">
                  <span>Total events</span>
                  <strong>248</strong>
                  <small>Current encounter</small>
                </div>
                <div className="stat-tile">
                  <span>Clinical edits</span>
                  <strong>17</strong>
                  <small>Note and transcript</small>
                </div>
                <div className="stat-tile">
                  <span>AI actions</span>
                  <strong>12</strong>
                  <small>Synthesis and evidence</small>
                </div>
                <div className="stat-tile">
                  <span>Denied</span>
                  <strong>0</strong>
                  <small>Current filter</small>
                </div>
              </div>
            </Panel>
          </div>

          <div className="clinical-grid">
            <Panel title="Event Detail">
              <KeyValueList
                items={[
                  ["Timestamp", selected[0]],
                  ["Actor", selected[1]],
                  ["Action", selected[2]],
                  ["Target", selected[3]],
                  ["Outcome", <Badge tone={selected[4] === "Success" ? "green" : "blue"}>{selected[4]}</Badge>],
                  ["Trace ID", "req_10-15-22"],
                  ["Request", "workspace-state / generated-output-review"]
                ]}
              />
            </Panel>

            <Panel title="Audit Narrative">
              <div className="note-box">
                <h3>{selected[2]}</h3>
                <p>{selected[5]}</p>
              </div>
            </Panel>

            <Panel title="Encounter Timeline">
              <Timeline
                items={auditEvents.slice(0, 6).map(([time, actor, action, target, outcome]) => [
                  time.slice(11),
                  `${action} · ${outcome}`,
                  `${actor} on ${target}`
                ])}
              />
            </Panel>

            <Panel title="Legend">
              <div className="state-stack">
                <div className="state-card">
                  <div className="button-cluster">
                    <Badge tone="green">Success</Badge>
                    <strong>Completed write</strong>
                  </div>
                  <p>Persisted action with actor, time, target, and trace.</p>
                </div>
                <div className="state-card">
                  <div className="button-cluster">
                    <Badge tone="blue">Acknowledged</Badge>
                    <strong>Clinician acknowledgement</strong>
                  </div>
                  <p>Captured review of warning, correction, or uncertainty.</p>
                </div>
                <div className="state-card">
                  <div className="button-cluster">
                    <Badge tone="red">Denied</Badge>
                    <strong>Permission denial</strong>
                  </div>
                  <p>Unauthorized approval attempts remain audit-visible.</p>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </main>
  );
}
