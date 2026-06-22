"use client";

import { useState } from "react";
import { Check, Database, Edit3, FileJson, Flag, RefreshCcw, X } from "lucide-react";
import { apiRequest } from "../../lib/api";
import {
  ActionButton,
  Badge,
  DataTable,
  PageHeader,
  Panel,
  PatientContextBar,
  Timeline
} from "../components/clinical-ui";
import {
  artifactHistory,
  evidenceFindings,
  highlights,
  rules,
  sourceTrace,
  suggestions
} from "../components/demo-data";

type ReviewStatus = "review_required" | "approved" | "edited" | "rejected" | "uncertain";

type MemoryWritebackResponse = {
  createdMemoryFacts: Array<{ id: string; content: string }>;
  skippedDuplicates: Array<{ sourceOutputId: string; content: string }>;
  rejectedSources: Array<{ sourceOutputId: string; reason: string }>;
};

type FhirExportResponse = {
  fhirExport: {
    id: string;
    exportKind: "referral" | "teleconsult";
    fhirBundle: Record<string, unknown>;
  };
};

const statusLabel: Record<ReviewStatus, string> = {
  review_required: "Review Required",
  approved: "Approved",
  edited: "Edited",
  rejected: "Rejected",
  uncertain: "Uncertain"
};

export default function ReviewPage() {
  const [status, setStatus] = useState<ReviewStatus>("review_required");
  const [note, setNote] = useState(
    "Review actions persist when the output is loaded from a live session."
  );
  const [exportJson, setExportJson] = useState<Record<string, unknown> | null>(null);

  async function review(action: "approve" | "edit" | "reject" | "mark-uncertain") {
    const outputId = new URLSearchParams(window.location.search).get("outputId");
    const nextStatus: ReviewStatus =
      action === "approve"
        ? "approved"
        : action === "edit"
          ? "edited"
          : action === "reject"
            ? "rejected"
            : "uncertain";
    if (!outputId) {
      setStatus(nextStatus);
      setNote(`Demo output marked ${statusLabel[nextStatus].toLowerCase()}.`);
      return;
    }
    const response = await apiRequest(`/outputs/${outputId}/${action}`, {
      method: "POST",
      body: JSON.stringify({
        note: `Clinician ${action} from review workspace.`,
        editedContent:
          action === "edit" ? { summary: "Edited from Phase 8 review workspace." } : undefined
      })
    });
    setNote(
      response.success
        ? `Output ${statusLabel[nextStatus].toLowerCase()} and audit logged.`
        : response.error.message
    );
    if (response.success) setStatus(nextStatus);
  }

  async function writeMemory() {
    const params = new URLSearchParams(window.location.search);
    const encounterId = params.get("encounterId");
    const outputId = params.get("outputId");
    if (!encounterId) {
      setNote("Demo memory writeback queued from approved closeout content.");
      return;
    }
    const response = await apiRequest<MemoryWritebackResponse>(
      `/encounters/${encounterId}/memory-writeback`,
      {
        method: "POST",
        body: JSON.stringify({ sourceOutputIds: outputId ? [outputId] : undefined })
      }
    );
    if (!response.success) {
      setNote(response.error.message);
      return;
    }
    setNote(
      `Memory writeback created ${response.data.createdMemoryFacts.length}, skipped ${response.data.skippedDuplicates.length}, rejected ${response.data.rejectedSources.length}.`
    );
  }

  async function generateFhir(exportKind: "referral" | "teleconsult") {
    const params = new URLSearchParams(window.location.search);
    const encounterId = params.get("encounterId");
    const outputId = params.get("outputId");
    if (!encounterId) {
      const demoBundle = {
        resourceType: "Bundle",
        type: "document",
        entry: [
          { resource: { resourceType: "Composition", status: "final", title: "Demo export" } }
        ]
      };
      setExportJson(demoBundle);
      setNote(`Demo ${exportKind} FHIR document bundle prepared.`);
      return;
    }
    const response = await apiRequest<FhirExportResponse>(
      `/encounters/${encounterId}/fhir-export`,
      {
        method: "POST",
        body: JSON.stringify({
          exportKind,
          sourceOutputId: outputId ?? undefined,
          destinationLabel:
            exportKind === "referral" ? "OB referral clinic" : "Specialist teleconsult"
        })
      }
    );
    if (!response.success) {
      setNote(response.error.message);
      return;
    }
    setExportJson(response.data.fhirExport.fhirBundle);
    setNote(`${exportKind === "referral" ? "Referral" : "Teleconsult"} FHIR export generated.`);
  }

  return (
    <main className="screen">
      <PageHeader
        eyebrow="Clinical review"
        title="Clinical Workspace / Review"
        description={note}
        actions={
          <>
            <ActionButton tone="secondary" onClick={() => review("mark-uncertain")}>
              <Flag size={15} />
              Mark uncertain
            </ActionButton>
            <ActionButton onClick={() => review("approve")}>
              <Check size={15} />
              Approve
            </ActionButton>
          </>
        }
      />

      <div className="clinical-grid">
        <PatientContextBar mode="review" />

        <div className="clinical-grid review-reference-grid">
          <div className="clinical-grid">
            <Panel
              title="Progressive Summary"
              subtitle="AI Draft v3"
              actions={
                <Badge
                  tone={status === "approved" ? "green" : status === "rejected" ? "red" : "amber"}
                >
                  {statusLabel[status]}
                </Badge>
              }
            >
              <div className="note-box">
                <p>
                  G2P1 at 28w4d with stable maternal vitals and appropriate fetal growth. Fundal
                  height is consistent with GA. Reports occasional low-back discomfort and leg
                  cramps. Denies vaginal bleeding, fluid leakage, or contractions.
                </p>
              </div>
              <div className="summary-metrics">
                <span>
                  <strong>0.86</strong> Confidence
                </span>
                <span>
                  <strong>18</strong> Observations
                </span>
                <span>
                  <strong>24</strong> Transcript turns
                </span>
              </div>
              <div className="button-cluster" style={{ marginTop: 8 }}>
                <ActionButton onClick={() => review("approve")}>
                  <Check size={15} />
                  Approve
                </ActionButton>
                <ActionButton tone="secondary" onClick={() => review("edit")}>
                  <Edit3 size={15} />
                  Edit
                </ActionButton>
                <ActionButton tone="danger" onClick={() => review("reject")}>
                  <X size={15} />
                  Reject
                </ActionButton>
                <ActionButton tone="ghost">
                  <RefreshCcw size={15} />
                  Regenerate
                </ActionButton>
              </div>
            </Panel>

            <Panel title="Deterministic Rules" subtitle="3 active">
              <DataTable
                columns={["Rule", "Severity", "Blocking", "Evidence", "Status"]}
                rows={rules.map(([rule, , severity, blocking, evidence, status]) => [
                  rule,
                  severity,
                  blocking,
                  evidence,
                  status
                ])}
                renderCell={(cell, index) => {
                  if (index === 1)
                    return <Badge tone={cell === "High" ? "red" : "amber"}>{cell}</Badge>;
                  if (index === 4)
                    return <Badge tone={cell === "Active" ? "red" : "blue"}>{cell}</Badge>;
                  return cell;
                }}
              />
            </Panel>

            <Panel title="Artifact History">
              <Timeline
                items={artifactHistory.map(([time, state, title, reviewState, actor]) => [
                  time,
                  `${title} · ${state}`,
                  `${reviewState} by ${actor}`
                ])}
              />
            </Panel>
          </div>

          <div className="clinical-grid">
            <Panel title="Highlights">
              <div className="highlight-grid">
                {highlights.map(([type, title, severity, confidence, sources]) => (
                  <div
                    className={`highlight-card ${severity === "High" ? "risk" : severity === "Medium" ? "warn" : "info"}`}
                    key={title}
                  >
                    <span>{type}</span>
                    <strong>{title}</strong>
                    <div className="button-cluster">
                      <Badge
                        tone={
                          severity === "High" ? "red" : severity === "Medium" ? "amber" : "blue"
                        }
                      >
                        {severity}
                      </Badge>
                      <small>{confidence}</small>
                    </div>
                    <small>{sources}</small>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Medical Evidence / Findings" subtitle="4 findings">
              <DataTable
                columns={["Finding", "Extracted Value", "Notes", "Provider Status", "Review"]}
                rows={evidenceFindings}
                renderCell={(cell, index) =>
                  index === 4 ? (
                    <Badge tone={cell === "Reviewed" ? "green" : "amber"}>{cell}</Badge>
                  ) : (
                    cell
                  )
                }
              />
            </Panel>
          </div>

          <div className="clinical-grid">
            <Panel title="Suggestions Checklist" subtitle="5">
              <DataTable
                columns={["Suggestion", "Rationale", "Priority", "Status", "Result"]}
                rows={suggestions}
                renderCell={(cell, index) =>
                  index === 2 ? (
                    <Badge tone={cell === "High" ? "red" : cell === "Medium" ? "amber" : "green"}>
                      {cell}
                    </Badge>
                  ) : (
                    cell
                  )
                }
              />
            </Panel>

            <Panel title="Source References / Evidence Trace" subtitle="28">
              <DataTable
                columns={["Time", "Source", "Actor", "Excerpt", "Ref"]}
                rows={sourceTrace}
              />
            </Panel>
          </div>
        </div>

        <div className="clinical-grid review-queue-grid">
          {[
            ["Draft", "Summary Draft v3", "Risk Synthesis v3", "amber"],
            ["Review Required", "Hemoglobin finding", "Preterm labor risk", "red"],
            ["Uncertain", "Proteinuria value", "Fetal presentation", "blue"],
            ["Rejected", "Fundal height 30cm", "Observation", "red"],
            ["Approved", "Blood pressure", "Observation", "green"]
          ].map(([group, first, second, tone]) => (
            <Panel key={group} title={group}>
              <div className="review-stack">
                <div className="review-card">
                  <strong>{first}</strong>
                  <Badge tone={tone as "amber" | "red" | "blue" | "green"}>{group}</Badge>
                </div>
                <div className="review-card">
                  <strong>{second}</strong>
                  <p>Observation · 10:15</p>
                </div>
              </div>
            </Panel>
          ))}
        </div>

        <div className="clinical-grid closeout-grid">
          <Panel title="Closeout Actions">
            <div className="closeout-actions">
              <ActionButton onClick={() => review("approve")}>
                <Check size={15} />
                Approve edited summary
              </ActionButton>
              <ActionButton tone="secondary" onClick={writeMemory}>
                <Database size={15} />
                Write memory
              </ActionButton>
              <ActionButton tone="secondary" onClick={() => generateFhir("referral")}>
                <FileJson size={15} />
                Referral FHIR
              </ActionButton>
              <ActionButton tone="secondary" onClick={() => generateFhir("teleconsult")}>
                <FileJson size={15} />
                Teleconsult FHIR
              </ActionButton>
              <ActionButton tone="secondary" onClick={() => review("mark-uncertain")}>
                <Flag size={15} />
                Mark uncertain
              </ActionButton>
              <ActionButton tone="danger" onClick={() => review("reject")}>
                <X size={15} />
                Reject draft
              </ActionButton>
              <ActionButton tone="ghost">Acknowledge finding</ActionButton>
            </div>
          </Panel>
          <Panel title="Blockers & Critical Items">
            <DataTable
              columns={["Item", "Severity", "State", "Action"]}
              rows={[
                ["Preterm labor risk not addressed in plan", "High", "Blocking", "Open"],
                ["Anemia status missing", "Medium", "Blocking", "Open"]
              ]}
              renderCell={(cell, index) =>
                index === 1 ? <Badge tone={cell === "High" ? "red" : "amber"}>{cell}</Badge> : cell
              }
            />
          </Panel>
          <Panel title="FHIR Export JSON" subtitle={exportJson ? "Generated" : "Waiting"}>
            <pre className="json-preview">
              {exportJson ? JSON.stringify(exportJson, null, 2) : "No FHIR export selected."}
            </pre>
          </Panel>
        </div>
      </div>
    </main>
  );
}
