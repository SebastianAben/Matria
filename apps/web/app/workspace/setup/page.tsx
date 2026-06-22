"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, CheckCircle2, ClipboardList, Loader2, PlayCircle, Plus } from "lucide-react";
import { apiRequest } from "../../../lib/api";
import {
  consentGranted,
  formatDate,
  formatDateTime,
  scopedHref,
  type ConsentMode,
  type ConsentRecord,
  type EncounterRecord,
  type PatientRecord,
  type PregnancyEpisode
} from "../../../lib/clinical-api";
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
  StatTile,
  Timeline
} from "../../components/clinical-ui";

type SetupState = "loading" | "ready" | "error";

const consentModes: ConsentMode[] = ["audio", "transcript", "ai", "media", "fhir_export"];

export default function EncounterSetupPage() {
  const [state, setState] = useState<SetupState>("loading");
  const [message, setMessage] = useState("Load a patient and pregnancy episode before creating the encounter.");
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [episodes, setEpisodes] = useState<PregnancyEpisode[]>([]);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState("");
  const [encounters, setEncounters] = useState<EncounterRecord[]>([]);
  const [encounter, setEncounter] = useState<EncounterRecord | null>(null);
  const [consents, setConsents] = useState<ConsentRecord[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    void loadScope(params);
  }, []);

  const selectedEpisode = useMemo(
    () => episodes.find((episode) => episode.id === selectedEpisodeId) ?? episodes[0] ?? null,
    [episodes, selectedEpisodeId]
  );

  async function loadScope(params: URLSearchParams) {
    const patientId = params.get("patientId");
    const episodeId = params.get("pregnancyEpisodeId");
    const encounterId = params.get("encounterId");
    if (!patientId) {
      setState("ready");
      setMessage("Select or register a patient first.");
      return;
    }
    setState("loading");
    const [patientResponse, episodeResponse, encounterResponse] = await Promise.all([
      apiRequest<{ patient: PatientRecord }>(`/patients/${patientId}`),
      apiRequest<{ pregnancyEpisodes: PregnancyEpisode[] }>(`/patients/${patientId}/pregnancy-episodes`),
      apiRequest<{ encounters: EncounterRecord[] }>(`/patients/${patientId}/encounters`)
    ]);
    if (!patientResponse.success) {
      setState("error");
      setMessage(patientResponse.error.message);
      return;
    }
    setPatient(patientResponse.data.patient);
    const loadedEpisodes = episodeResponse.success ? episodeResponse.data.pregnancyEpisodes : [];
    setEpisodes(loadedEpisodes);
    setSelectedEpisodeId(episodeId ?? loadedEpisodes[0]?.id ?? "");
    setEncounters(encounterResponse.success ? encounterResponse.data.encounters : []);

    if (encounterId) {
      await loadEncounter(encounterId);
    } else {
      setEncounter(null);
      setConsents([]);
    }
    setState("ready");
    setMessage("Confirm pregnancy scope, create the encounter, then record required consent.");
  }

  async function loadEncounter(encounterId: string) {
    const response = await apiRequest<{ encounter: EncounterRecord & { consentRecords?: ConsentRecord[] } }>(
      `/encounters/${encounterId}`
    );
    if (!response.success) {
      setMessage(response.error.message);
      return;
    }
    setEncounter(response.data.encounter);
    setSelectedEpisodeId(response.data.encounter.pregnancyEpisodeId);
    const consentResponse = await apiRequest<{ consentRecords: ConsentRecord[] }>(
      `/encounters/${encounterId}/consents`
    );
    setConsents(consentResponse.success ? consentResponse.data.consentRecords : []);
  }

  async function createEpisode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!patient) return;
    const form = new FormData(event.currentTarget);
    const response = await apiRequest<{ pregnancyEpisode: PregnancyEpisode }>(
      `/patients/${patient.id}/pregnancy-episodes`,
      {
        method: "POST",
        body: JSON.stringify({
          label: String(form.get("label") ?? "").trim(),
          gestationalAgeWeeks: form.get("gestationalAgeWeeks")
            ? Number(form.get("gestationalAgeWeeks"))
            : undefined,
          estimatedDueDate: String(form.get("estimatedDueDate") ?? "") || undefined,
          status: String(form.get("status") ?? "active")
        })
      }
    );
    if (!response.success) {
      setMessage(response.error.message);
      return;
    }
    setEpisodes((current) => [response.data.pregnancyEpisode, ...current]);
    setSelectedEpisodeId(response.data.pregnancyEpisode.id);
    setMessage("Pregnancy episode created and selected.");
    event.currentTarget.reset();
  }

  async function createEncounter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!patient || !selectedEpisode) return;
    const form = new FormData(event.currentTarget);
    const response = await apiRequest<{ encounter: EncounterRecord }>("/encounters", {
      method: "POST",
      body: JSON.stringify({
        patientId: patient.id,
        pregnancyEpisodeId: selectedEpisode.id,
        visitType: String(form.get("visitType") ?? "routine_anc"),
        facilityName: String(form.get("facilityName") ?? "").trim() || undefined
      })
    });
    if (!response.success) {
      setMessage(response.error.message);
      return;
    }
    setEncounter(response.data.encounter);
    setEncounters((current) => [response.data.encounter, ...current]);
    setConsents([]);
    setMessage("Encounter created. Record consent before ambient capture or AI synthesis.");
    const next = new URLSearchParams(window.location.search);
    next.set("patientId", patient.id);
    next.set("pregnancyEpisodeId", selectedEpisode.id);
    next.set("encounterId", response.data.encounter.id);
    window.history.replaceState(null, "", scopedHref("/workspace/setup", next));
  }

  async function recordConsent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!encounter) return;
    const form = new FormData(event.currentTarget);
    const response = await apiRequest<{ consentRecord: ConsentRecord }>(
      `/encounters/${encounter.id}/consents`,
      {
        method: "POST",
        body: JSON.stringify({
          mode: String(form.get("mode")),
          status: String(form.get("status")),
          note: String(form.get("note") ?? "").trim() || undefined
        })
      }
    );
    if (!response.success) {
      setMessage(response.error.message);
      return;
    }
    setConsents((current) => [response.data.consentRecord, ...current]);
    setMessage(`${response.data.consentRecord.mode} consent recorded as ${response.data.consentRecord.status}.`);
    event.currentTarget.reset();
  }

  async function startWorkspace() {
    if (!encounter || !patient || !selectedEpisode) return;
    let sessionId: string | null = null;
    const createResponse = await apiRequest<{ ambientSession: { id: string } }>(
      `/encounters/${encounter.id}/ambient-sessions`,
      { method: "POST", body: JSON.stringify({}) }
    );
    if (createResponse.success) sessionId = createResponse.data.ambientSession.id;
    const params = new URLSearchParams();
    params.set("patientId", patient.id);
    params.set("pregnancyEpisodeId", selectedEpisode.id);
    params.set("encounterId", encounter.id);
    if (sessionId) params.set("sessionId", sessionId);
    window.location.href = scopedHref("/workspace", params);
  }

  const scopeParams = new URLSearchParams();
  if (patient) scopeParams.set("patientId", patient.id);
  if (selectedEpisode) scopeParams.set("pregnancyEpisodeId", selectedEpisode.id);
  if (encounter) scopeParams.set("encounterId", encounter.id);

  if (state === "loading") {
    return (
      <main className="screen">
        <EmptyState title="Loading setup" description="Patient, pregnancy, and encounter scope are loading from the API." action={<Loader2 size={20} />} />
      </main>
    );
  }

  if (!patient) {
    return (
      <main className="screen">
        <EmptyState
          title="No patient selected"
          description={message}
          action={<Link className="action-button primary" href="/patients">Go to patient lookup</Link>}
        />
      </main>
    );
  }

  return (
    <main className="screen">
      <PageHeader
        eyebrow="Clinical workspace"
        title="Encounter Setup"
        description={message}
        actions={
          encounter ? (
            <ActionButton onClick={startWorkspace}>
              <PlayCircle size={15} />
              Open workspace
            </ActionButton>
          ) : null
        }
      />

      <div className="clinical-grid">
        {encounter && selectedEpisode ? (
          <PatientContextBar patient={patient} pregnancyEpisode={selectedEpisode} encounter={encounter} />
        ) : null}

        <div className="clinical-grid grid-main-aside">
          <div className="clinical-grid">
            <Panel title="Current Pregnancy" subtitle="Select or create the episode that scopes this encounter.">
              {selectedEpisode ? (
                <div className="stat-row">
                  <StatTile label="Episode" value={selectedEpisode.label} detail={selectedEpisode.status} icon={<ClipboardList size={16} />} />
                  <StatTile label="Gestational age" value={selectedEpisode.gestationalAgeWeeks == null ? "Missing" : `${selectedEpisode.gestationalAgeWeeks}w`} detail="Clinician-entered" icon={<CalendarClock size={16} />} />
                  <StatTile label="EDD" value={formatDate(selectedEpisode.estimatedDueDate)} detail="Required for FHIR referral" />
                  <StatTile label="Status" value={selectedEpisode.status} detail="Backend record" icon={<CheckCircle2 size={16} />} />
                </div>
              ) : (
                <EmptyState title="No pregnancy episode" description="Create an episode before starting an encounter." />
              )}
            </Panel>

            <Panel title="Episode Selection">
              {episodes.length === 0 ? (
                <EmptyState title="No episodes" description="This patient has no pregnancy episodes yet." />
              ) : (
                <div className="episode-list">
                  {episodes.map((item) => (
                    <button
                      className={`episode-card ${item.id === selectedEpisode?.id ? "active" : ""}`}
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedEpisodeId(item.id)}
                    >
                      <div className="button-cluster">
                        <strong>{item.label}</strong>
                        <Badge tone={item.status === "active" ? "green" : "gray"}>{item.status}</Badge>
                      </div>
                      <p>GA {item.gestationalAgeWeeks == null ? "missing" : `${item.gestationalAgeWeeks}w`} · EDD {formatDate(item.estimatedDueDate)}</p>
                    </button>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Recent Encounters">
              {encounters.length === 0 ? (
                <EmptyState title="No encounters" description="Create a backend encounter for this consultation." />
              ) : (
                <DataTable
                  columns={["Visit", "Created", "Status", "Clinician"]}
                  rows={encounters.map((item) => {
                    const params = new URLSearchParams(scopeParams);
                    params.set("pregnancyEpisodeId", item.pregnancyEpisodeId);
                    params.set("encounterId", item.id);
                    return [
                      <button key={item.id} className="action-button ghost" type="button" onClick={() => loadEncounter(item.id)}>
                        {item.visitType}
                      </button>,
                      formatDateTime(item.createdAt),
                      <Badge key={`${item.id}-status`} tone={item.status === "active" ? "green" : item.status === "reviewing" ? "amber" : "gray"}>{item.status}</Badge>,
                      item.createdBy?.fullName ?? "-"
                    ];
                  })}
                />
              )}
            </Panel>

            <Panel title="Setup Activity">
              <Timeline
                items={[
                  ["Now", "Patient scope", `${patient.fullName} selected from backend registry.`],
                  ["Next", "Pregnancy scope", selectedEpisode ? `${selectedEpisode.label} selected.` : "Create or select a pregnancy episode."],
                  ["Next", "Encounter scope", encounter ? `${encounter.visitType} created.` : "Create an encounter before live documentation."]
                ]}
              />
            </Panel>
          </div>

          <div className="clinical-grid">
            <Panel title="Create Pregnancy Episode" subtitle="Gestational age and EDD may be added when known.">
              <form className="form-grid" onSubmit={createEpisode}>
                <Field label="Label">
                  <input name="label" required placeholder="Episode 01" />
                </Field>
                <Field label="Gestational age weeks">
                  <input name="gestationalAgeWeeks" type="number" min="0" max="45" />
                </Field>
                <Field label="Estimated due date">
                  <input name="estimatedDueDate" type="date" />
                </Field>
                <Field label="Status">
                  <select name="status" defaultValue="active">
                    <option value="active">Active</option>
                    <option value="historical">Historical</option>
                  </select>
                </Field>
                <div className="wide">
                  <ActionButton type="submit">
                    <Plus size={15} />
                    Save episode
                  </ActionButton>
                </div>
              </form>
            </Panel>

            <Panel title="Encounter Details" subtitle="Creates a backend encounter under the selected patient and episode.">
              <form className="form-grid" onSubmit={createEncounter}>
                <Field label="Visit type">
                  <select name="visitType" defaultValue="routine_anc">
                    <option value="routine_anc">Routine ANC</option>
                    <option value="anc_follow_up">ANC Follow-up</option>
                    <option value="initial_anc">ANC Initial Visit</option>
                    <option value="urgent_review">Urgent Review</option>
                  </select>
                </Field>
                <Field label="Facility">
                  <input name="facilityName" placeholder="Clinic or hospital unit" />
                </Field>
                <div className="wide button-cluster">
                  <ActionButton type="submit" disabled={!selectedEpisode}>
                    <Plus size={15} />
                    Create encounter
                  </ActionButton>
                  {encounter ? (
                    <Link className="action-button secondary" href={scopedHref("/workspace", scopeParams)}>
                      Continue existing
                    </Link>
                  ) : null}
                </div>
              </form>
            </Panel>

            <Panel title="Consent Capture" subtitle="Latest consent controls downstream processing.">
              {encounter ? (
                <>
                  <form className="form-grid" onSubmit={recordConsent}>
                    <Field label="Mode">
                      <select name="mode" defaultValue="audio">
                        {consentModes.map((mode) => (
                          <option key={mode} value={mode}>{mode}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Status">
                      <select name="status" defaultValue="granted">
                        <option value="granted">Granted</option>
                        <option value="declined">Declined</option>
                        <option value="withdrawn">Withdrawn</option>
                      </select>
                    </Field>
                    <Field label="Note">
                      <textarea name="note" />
                    </Field>
                    <div className="wide">
                      <ActionButton type="submit">Record consent</ActionButton>
                    </div>
                  </form>
                  <div className="mini-card-grid" style={{ marginTop: 10 }}>
                    {consentModes.map((mode) => (
                      <div className="mini-card" key={mode}>
                        <strong>{mode}</strong>
                        <Badge tone={consentGranted(consents, mode) ? "green" : "amber"}>
                          {consents.find((record) => record.mode === mode)?.status ?? "missing"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState title="No encounter" description="Create or select an encounter before recording consent." />
              )}
            </Panel>

            <Panel title="Patient Context">
              <KeyValueList
                items={[
                  ["Patient", patient.fullName],
                  ["MRN", patient.hospitalNumber],
                  ["Phone", patient.phone ?? "-"],
                  ["Pregnancy", selectedEpisode?.label ?? "-"],
                  ["EDD", formatDate(selectedEpisode?.estimatedDueDate)],
                  ["Encounter", encounter?.status ?? "Not created"]
                ]}
              />
            </Panel>
          </div>
        </div>
      </div>
    </main>
  );
}
