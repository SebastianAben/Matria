"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Database, Download, Edit3, FileJson, Flag, Loader2, X } from "lucide-react";
import { apiRequest } from "../../lib/api";
import {
  contentText,
  formatDateTime,
  formatJsonPreview,
  scopedHref,
  type FhirExport,
  type WorkspaceState
} from "../../lib/clinical-api";
import {
  ActionButton,
  Badge,
  DataTable,
  EmptyState,
  PageHeader,
  Panel,
  PatientContextBar,
  Timeline
} from "../components/clinical-ui";

type MemoryWritebackResponse = {
  createdMemoryFacts: Array<{ id: string; content: string }>;
  skippedDuplicates: Array<{ sourceOutputId: string; content: string }>;
  rejectedSources: Array<{ sourceOutputId: string; reason: string }>;
};

type FhirExportResponse = {
  fhirExport: FhirExport;
};

type LoadState = "loading" | "ready" | "missing" | "error";

export default function ReviewPage() {
  const [state, setState] = useState<LoadState>("loading");
  const [message, setMessage] = useState("Review generated outputs before approved reuse.");
  const [workspace, setWorkspace] = useState<WorkspaceState | null>(null);
  const [selectedOutputId, setSelectedOutputId] = useState("");
  const [exports, setExports] = useState<FhirExport[]>([]);
  const [selectedExport, setSelectedExport] = useState<FhirExport | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encounterId = params.get("encounterId");
    const outputId = params.get("outputId");
    if (!encounterId) {
      setState("missing");
      setMessage("Open review from a backend encounter workspace.");
      return;
    }
    setSelectedOutputId(outputId ?? "");
    void loadReview(encounterId, outputId ?? undefined);
  }, []);

  const outputs = useMemo(
    () => workspace?.ambientSession?.generatedOutputs ?? [],
    [workspace]
  );
  const selectedOutput = outputs.find((output) => output.id === selectedOutputId) ?? outputs[0] ?? null;
  const approvedOutput = selectedOutput && ["approved", "edited"].includes(selectedOutput.status);

  async function loadReview(encounterId = workspace?.encounter.id, preferredOutputId?: string) {
    if (!encounterId) return;
    setState("loading");
    const [stateResponse, exportResponse] = await Promise.all([
      apiRequest<WorkspaceState>(`/encounters/${encounterId}/workspace-state`),
      apiRequest<{ fhirExports: FhirExport[] }>(`/encounters/${encounterId}/fhir-exports`)
    ]);
    if (!stateResponse.success) {
      setState("error");
      setMessage(stateResponse.error.message);
      return;
    }
    const loadedOutputs = stateResponse.data.ambientSession?.generatedOutputs ?? [];
    const nextOutput =
      preferredOutputId && loadedOutputs.some((output) => output.id === preferredOutputId)
        ? preferredOutputId
        : selectedOutputId && loadedOutputs.some((output) => output.id === selectedOutputId)
          ? selectedOutputId
          : loadedOutputs[0]?.id ?? "";
    setWorkspace(stateResponse.data);
    setSelectedOutputId(nextOutput);
    setExports(exportResponse.success ? exportResponse.data.fhirExports : []);
    setSelectedExport(exportResponse.success ? exportResponse.data.fhirExports[0] ?? null : null);
    setState("ready");
    setMessage((current) =>
      current === "Review generated outputs before approved reuse."
        ? "Review, edit, approve, reject, or mark generated outputs uncertain."
        : current
    );
  }

  async function review(action: "approve" | "edit" | "reject" | "mark-uncertain") {
    if (!selectedOutput || !workspace) return;
    const endpointAction = action;
    const body =
      action === "edit"
        ? {
            note: "Clinician edited output from review workspace.",
            editedContent: {
              ...selectedOutput.canonicalContent,
              ...selectedOutput.content,
              clinicianReviewNote: "Edited in web review before reuse."
            }
          }
        : { note: `Clinician ${action} from review workspace.` };
    const response = await apiRequest(`/outputs/${selectedOutput.id}/${endpointAction}`, {
      method: "POST",
      body: JSON.stringify(body)
    });
    setMessage(response.success ? `Output ${action.replace("-", " ")} saved.` : response.error.message);
    await loadReview(workspace.encounter.id, selectedOutput.id);
  }

  async function writeMemory() {
    if (!workspace || !selectedOutput) return;
    const response = await apiRequest<MemoryWritebackResponse>(
      `/encounters/${workspace.encounter.id}/memory-writeback`,
      {
        method: "POST",
        body: JSON.stringify({ sourceOutputIds: [selectedOutput.id] })
      }
    );
    if (!response.success) {
      setMessage(response.error.message);
      return;
    }
    setMessage(
      `Memory writeback created ${response.data.createdMemoryFacts.length}, skipped ${response.data.skippedDuplicates.length}, rejected ${response.data.rejectedSources.length}.`
    );
  }

  async function generateFhir(exportKind: "referral" | "teleconsult") {
    if (!workspace || !selectedOutput) return;
    const expectedType = exportKind === "referral" ? "referral_summary" : "teleconsult_summary";
    const response = await apiRequest<FhirExportResponse>(`/encounters/${workspace.encounter.id}/fhir-export`, {
      method: "POST",
      body: JSON.stringify({
        exportKind,
        sourceOutputId: selectedOutput.outputType === expectedType ? selectedOutput.id : undefined,
        destinationLabel: exportKind === "referral" ? "Referral destination" : "Teleconsult destination"
      })
    });
    if (!response.success) {
      setMessage(response.error.message);
      return;
    }
    setSelectedExport(response.data.fhirExport);
    setMessage(`${exportKind} FHIR document bundle generated.`);
    await loadReview(workspace.encounter.id, selectedOutput.id);
  }

  function downloadExport() {
    if (!selectedExport) return;
    const blob = new Blob([JSON.stringify(selectedExport.fhirBundle, null, 2)], {
      type: "application/fhir+json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedExport.exportKind}-${selectedExport.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (state === "loading") {
    return (
      <main className="screen">
        <EmptyState title="Loading review" description="Generated outputs and export records are loading from the backend." action={<Loader2 size={20} />} />
      </main>
    );
  }

  if (state === "missing" || !workspace) {
    return (
      <main className="screen">
        <EmptyState
          title="No encounter selected"
          description={message}
          action={<Link className="action-button primary" href="/patients">Find patient</Link>}
        />
      </main>
    );
  }

  const session = workspace.ambientSession;
  const latestSummary = session?.summaryRevisions?.[0] ?? null;
  const unresolvedRules = workspace.ruleResults.filter((rule) => rule.status === "active");
  const scopeParams = new URLSearchParams(window.location.search);
  scopeParams.set("encounterId", workspace.encounter.id);
  if (session) scopeParams.set("sessionId", session.id);

  return (
    <main className="screen">
      <PageHeader
        eyebrow="Clinical review"
        title="Clinical Workspace / Review"
        description={message}
        actions={
          selectedOutput ? (
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
          ) : null
        }
      />

      <div className="clinical-grid">
        <PatientContextBar
          mode="review"
          patient={workspace.encounter.patient}
          pregnancyEpisode={workspace.encounter.pregnancyEpisode}
          encounter={workspace.encounter}
          unresolvedCount={unresolvedRules.length}
        />

        <div className="clinical-grid review-reference-grid">
          <div className="clinical-grid">
            <Panel
              title="Generated Output"
              subtitle={selectedOutput ? selectedOutput.outputType : "No generated output"}
              actions={
                selectedOutput ? (
                  <Badge tone={selectedOutput.status === "approved" || selectedOutput.status === "edited" ? "green" : selectedOutput.status === "rejected" ? "red" : "amber"}>
                    {selectedOutput.status}
                  </Badge>
                ) : null
              }
            >
              {!selectedOutput ? (
                <EmptyState title="No AI drafts" description="Run synthesis in the workspace to create review-required outputs." action={<Link className="action-button secondary" href={scopedHref("/workspace", scopeParams)}>Return to workspace</Link>} />
              ) : (
                <>
                  <div className="note-box">
                    <h3>{selectedOutput.title}</h3>
                    <p>{contentText(selectedOutput.canonicalContent ?? selectedOutput.content)}</p>
                  </div>
                  <div className="summary-metrics">
                    <span><strong>{selectedOutput.confidence == null ? "-" : selectedOutput.confidence.toFixed(2)}</strong> Confidence</span>
                    <span><strong>{outputs.length}</strong> Outputs</span>
                    <span><strong>{formatDateTime(selectedOutput.updatedAt)}</strong> Updated</span>
                  </div>
                  <div className="button-cluster" style={{ marginTop: 8 }}>
                    <ActionButton onClick={() => review("approve")}><Check size={15} />Approve</ActionButton>
                    <ActionButton tone="secondary" onClick={() => review("edit")}><Edit3 size={15} />Edit</ActionButton>
                    <ActionButton tone="danger" onClick={() => review("reject")}><X size={15} />Reject</ActionButton>
                    <ActionButton tone="ghost" onClick={() => review("mark-uncertain")}><Flag size={15} />Uncertain</ActionButton>
                  </div>
                </>
              )}
            </Panel>

            <Panel title="Output Queue" subtitle="Backend generated outputs grouped by review status.">
              {outputs.length === 0 ? (
                <EmptyState title="No outputs" description="Generated outputs appear after synthesis or evidence processing." />
              ) : (
                <DataTable
                  columns={["Title", "Type", "Status", "Updated"]}
                  rows={outputs.map((output) => [
                    <button key={output.id} className="action-button ghost" type="button" onClick={() => setSelectedOutputId(output.id)}>
                      {output.title}
                    </button>,
                    output.outputType,
                    <Badge key={`${output.id}-status`} tone={output.status === "approved" || output.status === "edited" ? "green" : output.status === "rejected" ? "red" : "amber"}>{output.status}</Badge>,
                    formatDateTime(output.updatedAt)
                  ])}
                />
              )}
            </Panel>

            <Panel title="Artifact History">
              {session?.artifactRevisions?.length ? (
                <Timeline
                  items={session.artifactRevisions.slice(0, 8).map((artifact) => [
                    formatDateTime(String(artifact.createdAt ?? "")),
                    String(artifact.artifactType ?? "artifact"),
                    String(artifact.validationStatus ?? "recorded")
                  ])}
                />
              ) : (
                <EmptyState title="No artifact history" description="Artifact revisions appear after synthesis." />
              )}
            </Panel>
          </div>

          <div className="clinical-grid">
            <Panel title="Progressive Summary">
              {latestSummary ? (
                <div className="note-box">
                  <p>{latestSummary.content}</p>
                </div>
              ) : (
                <EmptyState title="No summary draft" description="Run synthesis in the workspace to create a progressive summary." />
              )}
            </Panel>

            <Panel title="Highlights">
              {session?.highlightCards?.length ? (
                <div className="highlight-grid">
                  {session.highlightCards.map((item) => (
                    <div className={`highlight-card ${item.severity === "critical" ? "risk" : item.severity === "warning" ? "warn" : "info"}`} key={item.id}>
                      <span>{item.type}</span>
                      <strong>{item.title}</strong>
                      <p>{item.body}</p>
                      <Badge tone={item.severity === "critical" ? "red" : item.severity === "warning" ? "amber" : "blue"}>{item.severity}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No highlights" description="Highlights appear after synthesis." />
              )}
            </Panel>

            <Panel title="Medical Evidence / Findings">
              {session?.evidenceFindings?.length ? (
                <DataTable
                  columns={["Task", "Findings", "Status", "Review"]}
                  rows={session.evidenceFindings.map((finding) => [
                    finding.taskType,
                    formatJsonPreview(finding.findings),
                    <Badge key={`${finding.id}-status`} tone={finding.processingStatus === "succeeded" ? "green" : "amber"}>{finding.processingStatus}</Badge>,
                    finding.clinicianReviewRequired ? "Required" : "Not required"
                  ])}
                />
              ) : (
                <EmptyState title="No evidence findings" description="Evidence findings appear only after backend evidence processing." />
              )}
            </Panel>
          </div>

          <div className="clinical-grid">
            <Panel title="Suggestions Checklist">
              {session?.suggestions?.length ? (
                <DataTable
                  columns={["Suggestion", "Priority", "Status", "Rationale"]}
                  rows={session.suggestions.map((suggestion) => [
                    suggestion.title,
                    <Badge key={`${suggestion.id}-priority`} tone={suggestion.priority === "urgent" ? "red" : suggestion.priority === "high" ? "amber" : "green"}>{suggestion.priority}</Badge>,
                    suggestion.status,
                    suggestion.rationale
                  ])}
                />
              ) : (
                <EmptyState title="No suggestions" description="Suggestions appear after synthesis." />
              )}
            </Panel>

            <Panel title="Deterministic Rules">
              {workspace.ruleResults.length ? (
                <DataTable
                  columns={["Rule", "Severity", "Blocking", "Status"]}
                  rows={workspace.ruleResults.map((rule) => [
                    rule.ruleId,
                    <Badge key={`${rule.id}-sev`} tone={rule.severity === "critical" ? "red" : rule.severity === "warning" ? "amber" : "blue"}>{rule.severity}</Badge>,
                    rule.blockingLevel,
                    rule.status
                  ])}
                />
              ) : (
                <EmptyState title="No rule results" description="Run preflight in the workspace to show deterministic rules." />
              )}
            </Panel>
          </div>
        </div>

        <div className="clinical-grid closeout-grid">
          <Panel title="Closeout Actions" subtitle={approvedOutput ? "Approved source selected" : "Approve or edit an output before memory/export reuse."}>
            <div className="closeout-actions">
              <ActionButton onClick={() => review("approve")} disabled={!selectedOutput}><Check size={15} />Approve output</ActionButton>
              <ActionButton tone="secondary" onClick={writeMemory} disabled={!approvedOutput}><Database size={15} />Write memory</ActionButton>
              <ActionButton tone="secondary" onClick={() => generateFhir("referral")} disabled={!approvedOutput}><FileJson size={15} />Referral FHIR</ActionButton>
              <ActionButton tone="secondary" onClick={() => generateFhir("teleconsult")} disabled={!approvedOutput}><FileJson size={15} />Teleconsult FHIR</ActionButton>
              <ActionButton tone="ghost" onClick={() => review("mark-uncertain")} disabled={!selectedOutput}><Flag size={15} />Mark uncertain</ActionButton>
              <ActionButton tone="danger" onClick={() => review("reject")} disabled={!selectedOutput}><X size={15} />Reject draft</ActionButton>
            </div>
          </Panel>

          <Panel title="Blockers & Critical Items">
            {unresolvedRules.length === 0 ? (
              <EmptyState title="No active blockers" description="FHIR export can still be blocked by backend safety gates such as consent or missing GA/EDD." />
            ) : (
              <DataTable
                columns={["Item", "Severity", "State", "Action"]}
                rows={unresolvedRules.map((rule) => [
                  rule.suggestedAction,
                  <Badge key={`${rule.id}-severity`} tone={rule.severity === "critical" ? "red" : "amber"}>{rule.severity}</Badge>,
                  rule.blockingLevel,
                  rule.status
                ])}
              />
            )}
          </Panel>

          <Panel title="FHIR Exports" subtitle={`${exports.length} generated`}>
            {exports.length === 0 ? (
              <EmptyState title="No FHIR export" description="Generate export after approving or editing referral/teleconsult content." />
            ) : (
              <DataTable
                columns={["Kind", "Status", "Generated", "Action"]}
                rows={exports.map((item) => [
                  item.exportKind,
                  <Badge key={`${item.id}-status`} tone={item.status === "generated" ? "green" : "red"}>{item.status}</Badge>,
                  formatDateTime(item.generatedAt),
                  <button key={item.id} className="action-button ghost" type="button" onClick={() => setSelectedExport(item)}>View JSON</button>
                ])}
              />
            )}
          </Panel>

          <Panel title="FHIR Export JSON" subtitle={selectedExport ? selectedExport.exportKind : "Waiting"}>
            <div className="button-cluster" style={{ marginBottom: 8 }}>
              <ActionButton tone="secondary" onClick={downloadExport} disabled={!selectedExport}>
                <Download size={15} />
                Download JSON
              </ActionButton>
            </div>
            <pre className="json-preview">
              {selectedExport ? JSON.stringify(selectedExport.fhirBundle, null, 2) : "No FHIR export selected."}
            </pre>
          </Panel>
        </div>
      </div>
    </main>
  );
}
