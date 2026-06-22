"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Mic, Play, Save, Square, WandSparkles } from "lucide-react";
import { apiRequest } from "../../lib/api";
import {
  consentGranted,
  formatDateTime,
  formatJsonPreview,
  scopedHref,
  type StructuredObservation,
  type WorkspaceState
} from "../../lib/clinical-api";
import {
  ActionButton,
  Badge,
  DataTable,
  EmptyState,
  Field,
  PageHeader,
  Panel,
  PatientContextBar,
  StatTile,
  Timeline
} from "../components/clinical-ui";

type LoadState = "loading" | "ready" | "error" | "missing";

export default function WorkspacePage() {
  const [state, setState] = useState<LoadState>("loading");
  const [message, setMessage] = useState("Load an encounter to begin live documentation.");
  const [workspace, setWorkspace] = useState<WorkspaceState | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [manualTranscript, setManualTranscript] = useState("");
  const [manualSpeaker, setManualSpeaker] = useState("Clinician");

  useEffect(() => {
    const encounterId = new URLSearchParams(window.location.search).get("encounterId");
    if (!encounterId) {
      setState("missing");
      setMessage("Choose or create an encounter before opening the live workspace.");
      return;
    }
    void loadWorkspace(encounterId);
  }, []);

  async function loadWorkspace(encounterId = workspace?.encounter.id) {
    if (!encounterId) return;
    setState("loading");
    const response = await apiRequest<WorkspaceState>(`/encounters/${encounterId}/workspace-state`);
    if (!response.success) {
      setState("error");
      setMessage(response.error.message);
      return;
    }
    setWorkspace(response.data);
    setNoteDraft(response.data.sessionNote?.content ?? "");
    setState("ready");
    setMessage((current) =>
      current === "Load an encounter to begin live documentation."
        ? "Document progressively as the consultation unfolds."
        : current
    );
  }

  async function ensureSession() {
    if (!workspace) return null;
    if (workspace.ambientSession) return workspace.ambientSession.id;
    const response = await apiRequest<{ ambientSession: { id: string } }>(
      `/encounters/${workspace.encounter.id}/ambient-sessions`,
      { method: "POST", body: JSON.stringify({}) }
    );
    if (!response.success) {
      setMessage(response.error.message);
      return null;
    }
    await loadWorkspace(workspace.encounter.id);
    return response.data.ambientSession.id;
  }

  async function startAmbient() {
    const sessionId = await ensureSession();
    if (!sessionId || !workspace) return;
    const response = await apiRequest(`/ambient-sessions/${sessionId}/start`, {
      method: "POST",
      body: JSON.stringify({})
    });
    setMessage(response.success ? "Ambient session started." : response.error.message);
    await loadWorkspace(workspace.encounter.id);
  }

  async function stopAmbient() {
    if (!workspace?.ambientSession) return;
    const response = await apiRequest(`/ambient-sessions/${workspace.ambientSession.id}/stop`, {
      method: "POST",
      body: JSON.stringify({})
    });
    setMessage(response.success ? "Ambient session stopped." : response.error.message);
    await loadWorkspace(workspace.encounter.id);
  }

  async function saveNote(event?: FormEvent) {
    event?.preventDefault();
    if (!workspace) return;
    const response = await apiRequest<{ sessionNote: { version: number } }>(
      `/encounters/${workspace.encounter.id}/session-note`,
      { method: "PUT", body: JSON.stringify({ content: noteDraft }) }
    );
    setMessage(response.success ? `Session note saved as version ${response.data.sessionNote.version}.` : response.error.message);
    await loadWorkspace(workspace.encounter.id);
  }

  async function addObservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspace) return;
    const form = new FormData(event.currentTarget);
    const key = String(form.get("key") ?? "").trim();
    const value = String(form.get("value") ?? "").trim();
    const unit = String(form.get("unit") ?? "").trim();
    const payload = {
      type: String(form.get("type")),
      value: { [key || "value"]: value, ...(unit ? { unit } : {}) },
      verificationStatus: "clinician_entered",
      source: "manual_entry"
    };
    const response = await apiRequest<{ observation: StructuredObservation }>(
      `/encounters/${workspace.encounter.id}/observations`,
      { method: "POST", body: JSON.stringify(payload) }
    );
    setMessage(response.success ? "Observation saved." : response.error.message);
    if (response.success) event.currentTarget.reset();
    await loadWorkspace(workspace.encounter.id);
  }

  async function addTranscript(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspace) return;
    const sessionId = await ensureSession();
    if (!sessionId) return;
    const response = await apiRequest(`/ambient-sessions/${sessionId}/transcript-turns`, {
      method: "POST",
      body: JSON.stringify({
        speakerLabel: manualSpeaker,
        speakerRoleGuess: manualSpeaker.toLowerCase().includes("patient") ? "patient" : "clinician",
        startTimeMs: (workspace.ambientSession?.transcriptTurns?.length ?? 0) * 1000,
        endTimeMs: ((workspace.ambientSession?.transcriptTurns?.length ?? 0) + 1) * 1000,
        text: manualTranscript,
        languageCode: "id-ID"
      })
    });
    setMessage(response.success ? "Transcript turn added." : response.error.message);
    if (response.success) {
      setManualTranscript("");
      setManualSpeaker("Clinician");
    }
    await loadWorkspace(workspace.encounter.id);
  }

  async function runPreflight() {
    if (!workspace) return;
    const response = await apiRequest<{ ruleResults: unknown[] }>(
      `/encounters/${workspace.encounter.id}/preflight`,
      { method: "POST", body: JSON.stringify({}) }
    );
    setMessage(response.success ? `Preflight completed with ${response.data.ruleResults.length} result(s).` : response.error.message);
    await loadWorkspace(workspace.encounter.id);
  }

  async function runSynthesis() {
    if (!workspace) return;
    const sessionId = await ensureSession();
    if (!sessionId) return;
    const response = await apiRequest(`/ambient-sessions/${sessionId}/synthesis-ticks`, {
      method: "POST",
      body: JSON.stringify({ triggerReason: "clinician_requested_review" })
    });
    setMessage(response.success ? "Synthesis completed. Review generated drafts before approval." : response.error.message);
    await loadWorkspace(workspace.encounter.id);
  }

  if (state === "loading") {
    return (
      <main className="screen">
        <EmptyState title="Loading workspace" description="Encounter state is loading from the backend." action={<Loader2 size={20} />} />
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
  const transcriptTurns = session?.transcriptTurns ?? [];
  const summaries = session?.summaryRevisions ?? [];
  const unresolvedCount =
    workspace.ruleResults.filter((rule) => rule.status === "active").length +
    (session?.suggestions ?? []).filter((suggestion) => suggestion.status === "open").length +
    (session?.generatedOutputs ?? []).filter((output) => output.status === "review_required").length;
  const reviewParams = new URLSearchParams(window.location.search);
  reviewParams.set("encounterId", workspace.encounter.id);
  if (session) reviewParams.set("sessionId", session.id);

  return (
    <main className="screen">
      <PageHeader
        eyebrow="Ambient encounter"
        title="Clinical Workspace / Live Encounter"
        description={message}
        actions={
          <>
            <ActionButton tone="secondary" onClick={() => saveNote()}>
              <Save size={15} />
              Save note
            </ActionButton>
            <ActionButton onClick={runSynthesis}>
              <WandSparkles size={15} />
              Generate review
            </ActionButton>
          </>
        }
      />

      <div className="clinical-grid">
        <PatientContextBar
          patient={workspace.encounter.patient}
          pregnancyEpisode={workspace.encounter.pregnancyEpisode}
          encounter={workspace.encounter}
          unresolvedCount={unresolvedCount}
        />

        <div className="ambient-strip">
          <Panel title="Ambient Capture" subtitle={session ? `${session.provider} · ${session.status}` : "No session yet"}>
            <div className="button-cluster">
              <ActionButton onClick={startAmbient} disabled={!consentGranted(workspace.consentRecords, "audio") || !consentGranted(workspace.consentRecords, "transcript")}>
                <Mic size={15} />
                Start
              </ActionButton>
              <ActionButton tone="ghost" onClick={stopAmbient} disabled={!session}>
                <Square size={15} />
                Stop
              </ActionButton>
            </div>
          </Panel>
          <Panel title="Consent">
            <StatTile label="Audio" value={consentGranted(workspace.consentRecords, "audio") ? "Granted" : "Missing"} detail="Required for listening" />
          </Panel>
          <Panel title="AI">
            <StatTile label="Consent" value={consentGranted(workspace.consentRecords, "ai") ? "Granted" : "Missing"} detail="Required for synthesis" />
          </Panel>
          <Panel title="Queue">
            <StatTile label="Unresolved" value={String(unresolvedCount)} detail="Rules, drafts, suggestions" />
          </Panel>
        </div>

        <div className="clinical-grid grid-even">
          <Panel title="Live Transcript" subtitle="Backend transcript turns in time order.">
            {transcriptTurns.length === 0 ? (
              <EmptyState title="No transcript yet" description="Start ambient capture or enter a manual transcript turn after consent." />
            ) : (
              <div className="note-stack">
                {transcriptTurns.map((turn) => (
                  <div className="transcript-line" key={turn.id}>
                    <span>{Math.round(turn.startTimeMs / 1000)}s</span>
                    <strong>{turn.speakerLabel}</strong>
                    <p>{turn.text}</p>
                    <Badge tone={turn.correctionStatus === "clinician_corrected" ? "blue" : "gray"}>
                      {turn.sttConfidence == null ? turn.correctionStatus : turn.sttConfidence.toFixed(2)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            <form className="form-grid" onSubmit={addTranscript} style={{ marginTop: 10 }}>
              <Field label="Speaker">
                <input value={manualSpeaker} onChange={(event) => setManualSpeaker(event.target.value)} />
              </Field>
              <Field label="Transcript text">
                <textarea value={manualTranscript} onChange={(event) => setManualTranscript(event.target.value)} required />
              </Field>
              <div className="wide">
                <ActionButton type="submit">
                  <Play size={15} />
                  Add transcript turn
                </ActionButton>
              </div>
            </form>
          </Panel>

          <Panel title="Structured Observations" subtitle="Clinician-entered encounter facts.">
            <form className="form-grid" onSubmit={addObservation}>
              <Field label="Type">
                <select name="type" defaultValue="vitals">
                  <option value="vitals">Vitals</option>
                  <option value="labs">Labs</option>
                  <option value="symptoms">Symptoms</option>
                  <option value="history">History</option>
                  <option value="medications">Medications</option>
                  <option value="allergies">Allergies</option>
                  <option value="gestational_age">Gestational age</option>
                </select>
              </Field>
              <Field label="Field">
                <input name="key" placeholder="bloodPressure" required />
              </Field>
              <Field label="Value">
                <input name="value" required />
              </Field>
              <Field label="Unit">
                <input name="unit" />
              </Field>
              <div className="wide">
                <ActionButton type="submit">Save observation</ActionButton>
              </div>
            </form>
            {workspace.observations.length === 0 ? (
              <EmptyState title="No observations yet" description="Vitals, labs, symptoms, history, medications, allergies, and gestational age appear after entry." />
            ) : (
              <DataTable
                columns={["Type", "Value", "Source", "Status"]}
                rows={workspace.observations.map((item) => [
                  item.type,
                  formatJsonPreview(item.value),
                  item.source,
                  <Badge key={item.id} tone="green">{item.verificationStatus}</Badge>
                ])}
              />
            )}
          </Panel>
        </div>

        <div className="clinical-grid workspace-bottom">
          <Panel title="Deterministic Rules Summary" subtitle={`${workspace.ruleResults.length} current result(s)`}>
            <div className="button-cluster" style={{ marginBottom: 8 }}>
              <ActionButton tone="secondary" onClick={runPreflight}>Run preflight</ActionButton>
            </div>
            {workspace.ruleResults.length === 0 ? (
              <EmptyState title="No rule results" description="Run preflight after adding clinical context." />
            ) : (
              <DataTable
                columns={["Rule", "Severity", "Blocking", "Evidence", "Status"]}
                rows={workspace.ruleResults.map((rule) => [
                  rule.ruleId,
                  <Badge key={`${rule.id}-sev`} tone={rule.severity === "critical" ? "red" : rule.severity === "warning" ? "amber" : "blue"}>{rule.severity}</Badge>,
                  rule.blockingLevel,
                  formatJsonPreview(rule.evidence),
                  <Badge key={`${rule.id}-status`} tone={rule.status === "active" ? "amber" : "green"}>{rule.status}</Badge>
                ])}
              />
            )}
          </Panel>

          <Panel title="Session Note" subtitle={`Clinician-authored · version ${workspace.sessionNote?.version ?? 0}`}>
            <form onSubmit={saveNote}>
              <Field label="Subjective / Objective / Assessment / Plan">
                <textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} />
              </Field>
              <div className="button-cluster" style={{ marginTop: 10 }}>
                <ActionButton type="submit">
                  <Save size={15} />
                  Save note
                </ActionButton>
                <ActionButton type="button" tone="secondary" onClick={runSynthesis}>
                  <WandSparkles size={15} />
                  Run synthesis
                </ActionButton>
              </div>
            </form>
          </Panel>

          <Panel title="Progressive Drafts">
            {summaries.length === 0 ? (
              <EmptyState title="No AI drafts" description="Run synthesis after saving clinician context and consent." />
            ) : (
              <div className="note-box">
                <h3>Latest summary</h3>
                <p>{summaries[0]?.content}</p>
              </div>
            )}
            <div className="button-cluster" style={{ marginTop: 10 }}>
              <Link className="action-button secondary" href={scopedHref("/review", reviewParams)}>
                Open review
              </Link>
            </div>
          </Panel>

          <Panel title="Recent Activity">
            {workspace.recentActivity.length === 0 ? (
              <EmptyState title="No activity yet" description="Audit-visible activity appears as clinicians work." />
            ) : (
              <Timeline
                items={workspace.recentActivity.slice(0, 5).map((item) => [
                  formatDateTime(item.createdAt),
                  `${item.action} · ${item.outcome}`,
                  `${item.targetType}${item.targetId ? ` ${item.targetId}` : ""}`
                ])}
              />
            )}
          </Panel>
        </div>
      </div>
    </main>
  );
}
