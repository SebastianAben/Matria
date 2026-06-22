"use client";

import { FormEvent, useState } from "react";
import {
  clinicalFileKinds,
  consentModes,
  consentStatuses,
  encounterStatuses,
  observationTypes
} from "@matria/shared";
import { apiRequest } from "../../lib/api";

type Patient = {
  id: string;
  hospitalNumber: string;
  fullName: string;
};

type PregnancyEpisode = {
  id: string;
  label: string;
  status: string;
};

type Encounter = {
  id: string;
  status: string;
  visitType: string;
  patient: Patient;
  pregnancyEpisode: PregnancyEpisode;
  consentRecords: Array<{ id: string; mode: string; status: string; createdAt: string }>;
  observations: Array<{ id: string; type: string; value: unknown; createdAt: string }>;
  clinicalFiles: ClinicalFile[];
  sessionNote: { id: string; content: string; version: number } | null;
};

type ClinicalFile = {
  id: string;
  kind: string;
  fileName: string;
  mimeType: string;
  sizeBytes?: number;
  checksumSha256?: string | null;
  frameSamples?: FrameSample[];
};

type RuleResult = {
  id: string;
  ruleId: string;
  severity: string;
  blockingLevel: string;
  actionType: string;
  evidence: Record<string, unknown>;
  sourceReferences: Array<{ type: string; id?: string; label?: string }>;
  confidence: number;
  suggestedAction: string;
  thresholdDescription?: string;
  needsLocalGuidelineValidation: boolean;
  status: string;
};

type AmbientSession = {
  id: string;
  status: string;
  provider: string;
  failureReason?: string | null;
};

type TranscriptTurn = {
  id: string;
  speakerLabel: string;
  speakerRoleGuess: string;
  startTimeMs: number;
  endTimeMs: number;
  text: string;
  sttConfidence?: number | null;
  diarizationConfidence?: number | null;
  correctionStatus: string;
};

type SummaryRevision = {
  id: string;
  content: string;
  confidence?: number | null;
  createdAt: string;
};

type HighlightCard = {
  id: string;
  type: string;
  severity: string;
  title: string;
  body: string;
  confidence: number;
  requiresAcknowledgement: boolean;
};

type Suggestion = {
  id: string;
  title: string;
  rationale: string;
  priority: string;
  status: string;
  resultOptions: Array<{ value: string; label: string }>;
  freeTextAllowed: boolean;
  results: Array<{ id: string; selectedOptionLabel?: string | null; freeTextNote?: string | null }>;
};

type FrameSample = {
  id: string;
  clinicalFileId: string;
  processingStatus: string;
  failureReason?: string | null;
  sourceTimestampMs?: number | null;
  width?: number | null;
  height?: number | null;
};

type EvidenceHandoff = {
  id: string;
  taskType: string;
  exactQuestion: string;
  provider: string;
  model: string;
  status: string;
  failureReason?: string | null;
};

type EvidenceFinding = {
  id: string;
  taskType: string;
  findings: string[];
  extractedValues: Array<{ label: string; value: string; unit?: string; confidence?: number }>;
  confidence: number;
  uncertaintyReasons: string[];
  qualityLimitations: string[];
  clinicianReviewRequired: boolean;
  provider: string;
  model: string;
};

export default function PatientsPage() {
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [episodes, setEpisodes] = useState<PregnancyEpisode[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<PregnancyEpisode | null>(null);
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [note, setNote] = useState("");
  const [ruleResults, setRuleResults] = useState<RuleResult[]>([]);
  const [ambientSession, setAmbientSession] = useState<AmbientSession | null>(null);
  const [transcriptTurns, setTranscriptTurns] = useState<TranscriptTurn[]>([]);
  const [editingTurnId, setEditingTurnId] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<SummaryRevision[]>([]);
  const [highlights, setHighlights] = useState<HighlightCard[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [clinicalFiles, setClinicalFiles] = useState<ClinicalFile[]>([]);
  const [evidenceHandoffs, setEvidenceHandoffs] = useState<EvidenceHandoff[]>([]);
  const [evidenceFindings, setEvidenceFindings] = useState<EvidenceFinding[]>([]);
  const [frameSamples, setFrameSamples] = useState<FrameSample[]>([]);

  async function searchPatients(event?: FormEvent) {
    event?.preventDefault();
    setMessage("Searching patients...");
    const response = await apiRequest<{ patients: Patient[] }>(
      `/patients?search=${encodeURIComponent(search)}`
    );
    if (response.success) {
      setPatients(response.data.patients);
      setMessage(response.data.patients.length ? "Patients loaded." : "No matching patients.");
    } else {
      setMessage(response.error.message);
    }
  }

  async function createPatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await apiRequest<{ patient: Patient }>("/patients", {
      method: "POST",
      body: JSON.stringify({
        hospitalNumber: form.get("hospitalNumber"),
        fullName: form.get("fullName"),
        phone: form.get("phone") || undefined
      })
    });
    if (response.success) {
      setSelectedPatient(response.data.patient);
      setPatients((current) => [response.data.patient, ...current]);
      setMessage("Patient created.");
    } else {
      setMessage(response.error.message);
    }
  }

  async function choosePatient(patient: Patient) {
    setSelectedPatient(patient);
    setSelectedEpisode(null);
    setEncounter(null);
    setRuleResults([]);
    setAmbientSession(null);
    setTranscriptTurns([]);
    setSummaries([]);
    setHighlights([]);
    setSuggestions([]);
    setClinicalFiles([]);
    setEvidenceHandoffs([]);
    setEvidenceFindings([]);
    setFrameSamples([]);
    setMessage("Loading pregnancy episodes...");
    const response = await apiRequest<{ pregnancyEpisodes: PregnancyEpisode[] }>(
      `/patients/${patient.id}/pregnancy-episodes`
    );
    if (response.success) {
      setEpisodes(response.data.pregnancyEpisodes);
      setMessage("Pregnancy episodes loaded.");
    } else {
      setMessage(response.error.message);
    }
  }

  async function createEpisode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPatient) return;
    const form = new FormData(event.currentTarget);
    const response = await apiRequest<{ pregnancyEpisode: PregnancyEpisode }>(
      `/patients/${selectedPatient.id}/pregnancy-episodes`,
      {
        method: "POST",
        body: JSON.stringify({
          label: form.get("label"),
          gestationalAgeWeeks: Number(form.get("gestationalAgeWeeks")) || undefined,
          status: "active"
        })
      }
    );
    if (response.success) {
      setSelectedEpisode(response.data.pregnancyEpisode);
      setEpisodes((current) => [response.data.pregnancyEpisode, ...current]);
      setMessage("Pregnancy episode created.");
    } else {
      setMessage(response.error.message);
    }
  }

  async function createEncounter() {
    if (!selectedPatient || !selectedEpisode) return;
    const response = await apiRequest<{ encounter: Encounter }>("/encounters", {
      method: "POST",
      body: JSON.stringify({
        patientId: selectedPatient.id,
        pregnancyEpisodeId: selectedEpisode.id,
        visitType: "routine_anc",
        facilityName: "Matria Demo Clinic"
      })
    });
    if (response.success) {
      setEncounter(response.data.encounter);
      setNote(response.data.encounter.sessionNote?.content ?? "");
      setRuleResults([]);
      setAmbientSession(null);
      setTranscriptTurns([]);
      setSummaries([]);
      setHighlights([]);
      setSuggestions([]);
      setClinicalFiles([]);
      setEvidenceHandoffs([]);
      setEvidenceFindings([]);
      setFrameSamples([]);
      setMessage("Encounter created.");
    } else {
      setMessage(response.error.message);
    }
  }

  async function refreshEncounter(encounterId = encounter?.id) {
    if (!encounterId) return;
    const response = await apiRequest<{ encounter: Encounter }>(`/encounters/${encounterId}`);
    if (response.success) {
      setEncounter(response.data.encounter);
      setNote(response.data.encounter.sessionNote?.content ?? "");
      setClinicalFiles(response.data.encounter.clinicalFiles ?? []);
    } else {
      setMessage(response.error.message);
    }
  }

  async function transitionEncounter(status: string) {
    if (!encounter) return;
    const response = await apiRequest<{ encounter: Encounter }>(
      `/encounters/${encounter.id}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status })
      }
    );
    if (response.success) {
      await refreshEncounter(response.data.encounter.id);
      setMessage(`Encounter moved to ${status}.`);
    } else {
      setMessage(response.error.message);
    }
  }

  async function recordConsent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!encounter) return;
    const form = new FormData(event.currentTarget);
    const response = await apiRequest(`/encounters/${encounter.id}/consents`, {
      method: "POST",
      body: JSON.stringify({
        mode: form.get("mode"),
        status: form.get("status"),
        note: form.get("note") || undefined
      })
    });
    if (response.success) {
      await refreshEncounter();
      setMessage("Consent recorded.");
    } else {
      setMessage(response.error.message);
    }
  }

  async function addObservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!encounter) return;
    const form = new FormData(event.currentTarget);
    const label = String(form.get("label") ?? "").trim();
    const value = String(form.get("value") ?? "").trim();
    const response = await apiRequest(`/encounters/${encounter.id}/observations`, {
      method: "POST",
      body: JSON.stringify({
        type: form.get("type"),
        value: { [label]: numericOrString(value) },
        verificationStatus: "clinician_entered",
        source: "manual_entry"
      })
    });
    if (response.success) {
      await refreshEncounter();
      setMessage("Observation saved.");
    } else {
      setMessage(response.error.message);
    }
  }

  async function addFileMetadata(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!encounter) return;
    const form = new FormData(event.currentTarget);
    const response = await apiRequest(`/encounters/${encounter.id}/files`, {
      method: "POST",
      body: JSON.stringify({
        kind: form.get("kind"),
        fileName: form.get("fileName"),
        mimeType: form.get("mimeType"),
        sizeBytes: Number(form.get("sizeBytes")) || 0
      })
    });
    if (response.success) {
      await refreshEncounter();
      setMessage("File metadata saved.");
    } else {
      setMessage(response.error.message);
    }
  }

  async function uploadClinicalFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!encounter) return;
    const form = new FormData(event.currentTarget);
    const response = await apiRequest<{ clinicalFile: ClinicalFile }>(
      `/encounters/${encounter.id}/files/upload`,
      {
        method: "POST",
        body: form
      }
    );
    if (response.success) {
      await refreshEncounter();
      await loadClinicalFiles();
      setMessage("Clinical file uploaded for review.");
      event.currentTarget.reset();
    } else {
      setMessage(response.error.message);
    }
  }

  async function loadClinicalFiles(encounterId = encounter?.id) {
    if (!encounterId) return;
    const response = await apiRequest<{ clinicalFiles: ClinicalFile[] }>(
      `/encounters/${encounterId}/files`
    );
    if (response.success) {
      setClinicalFiles(response.data.clinicalFiles);
    } else {
      setMessage(response.error.message);
    }
  }

  async function sampleFrames(clinicalFileId: string) {
    const response = await apiRequest<{ frameSamples: FrameSample[] }>(
      `/clinical-files/${clinicalFileId}/frame-samples`,
      {
        method: "POST",
        body: JSON.stringify({
          ambientSessionId: ambientSession?.id,
          intervalSeconds: 5
        })
      }
    );
    if (response.success) {
      await loadClinicalFiles();
      await loadEvidence();
      setMessage(`Created ${response.data.frameSamples.length} frame sample(s).`);
    } else {
      setMessage(response.error.message);
    }
  }

  async function createEvidenceHandoff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ambientSession) return;
    const form = new FormData(event.currentTarget);
    const clinicalFileId = String(form.get("clinicalFileId") ?? "");
    const taskType = String(form.get("taskType") ?? "visible_finding_description");
    const exactQuestion = String(form.get("exactQuestion") ?? "").trim();
    const selectedSamples = frameSamples.filter(
      (sample) => sample.clinicalFileId === clinicalFileId
    );
    const response = await apiRequest<{ handoff: EvidenceHandoff }>(
      `/ambient-sessions/${ambientSession.id}/evidence-handoffs`,
      {
        method: "POST",
        body: JSON.stringify({
          taskType,
          exactQuestion,
          clinicalFileIds: clinicalFileId ? [clinicalFileId] : [],
          frameSampleIds: selectedSamples.map((sample) => sample.id),
          expectedOutputSchema: { clinicianReviewRequired: true }
        })
      }
    );
    if (response.success) {
      await loadEvidence();
      setMessage("Evidence handoff created.");
      event.currentTarget.reset();
    } else {
      setMessage(response.error.message);
    }
  }

  async function runEvidenceHandoff(handoffId: string) {
    const response = await apiRequest<{
      handoff: EvidenceHandoff;
      finding: EvidenceFinding | null;
    }>(`/evidence-handoffs/${handoffId}/run`, { method: "POST" });
    if (response.success) {
      await loadEvidence();
      setMessage(
        response.data.finding
          ? "Evidence analysis completed for clinician review."
          : "Evidence analysis failed safely; workflow remains available."
      );
    } else {
      setMessage(response.error.message);
    }
  }

  async function loadEvidence(sessionId = ambientSession?.id) {
    if (!sessionId) return;
    const response = await apiRequest<{
      handoffs: EvidenceHandoff[];
      findings: EvidenceFinding[];
      frameSamples: FrameSample[];
    }>(`/ambient-sessions/${sessionId}/evidence`);
    if (response.success) {
      setEvidenceHandoffs(response.data.handoffs);
      setEvidenceFindings(response.data.findings);
      setFrameSamples(response.data.frameSamples);
    } else {
      setMessage(response.error.message);
    }
  }

  async function saveNote() {
    if (!encounter) return;
    const response = await apiRequest<{ sessionNote: { version: number } }>(
      `/encounters/${encounter.id}/session-note`,
      {
        method: "PUT",
        body: JSON.stringify({ content: note })
      }
    );
    if (response.success) {
      await refreshEncounter();
      setMessage(`Session note saved as version ${response.data.sessionNote.version}.`);
    } else {
      setMessage(response.error.message);
    }
  }

  async function runPreflight() {
    if (!encounter) return;
    setMessage("Running deterministic preflight...");
    const response = await apiRequest<{ ruleResults: RuleResult[] }>(
      `/encounters/${encounter.id}/preflight`,
      { method: "POST" }
    );
    if (response.success) {
      setRuleResults(response.data.ruleResults);
      setMessage(
        response.data.ruleResults.length
          ? "Preflight completed with active findings."
          : "Preflight completed with no active findings."
      );
    } else {
      setMessage(response.error.message);
    }
  }

  async function updateRuleResult(ruleResultId: string, status: string) {
    const response = await apiRequest<{ ruleResult: RuleResult }>(`/rule-results/${ruleResultId}`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    if (response.success) {
      setRuleResults((current) =>
        current.map((rule) => (rule.id === ruleResultId ? response.data.ruleResult : rule))
      );
      setMessage(`Rule result marked ${status}.`);
    } else {
      setMessage(response.error.message);
    }
  }

  async function createAmbientSession() {
    if (!encounter) return;
    const response = await apiRequest<{ ambientSession: AmbientSession }>(
      `/encounters/${encounter.id}/ambient-sessions`,
      { method: "POST", body: JSON.stringify({}) }
    );
    if (response.success) {
      setAmbientSession(response.data.ambientSession);
      setTranscriptTurns([]);
      setSummaries([]);
      setHighlights([]);
      setSuggestions([]);
      setEvidenceHandoffs([]);
      setEvidenceFindings([]);
      setFrameSamples([]);
      setMessage("Ambient session created.");
    } else {
      setMessage(response.error.message);
    }
  }

  async function startAmbientSession() {
    if (!ambientSession) return;
    const response = await apiRequest<{ ambientSession: AmbientSession }>(
      `/ambient-sessions/${ambientSession.id}/start`,
      { method: "POST" }
    );
    if (response.success) {
      setAmbientSession(response.data.ambientSession);
      setMessage("Ambient session listening.");
    } else {
      setMessage(response.error.message);
    }
  }

  async function stopAmbientSession() {
    if (!ambientSession) return;
    const response = await apiRequest<{ ambientSession: AmbientSession }>(
      `/ambient-sessions/${ambientSession.id}/stop`,
      { method: "POST" }
    );
    if (response.success) {
      setAmbientSession(response.data.ambientSession);
      setMessage("Ambient session closed.");
    } else {
      setMessage(response.error.message);
    }
  }

  async function submitMockAudioEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ambientSession) return;
    const form = new FormData(event.currentTarget);
    const response = await apiRequest<{
      transcriptTurns: TranscriptTurn[];
    }>(`/ambient-sessions/${ambientSession.id}/audio-events`, {
      method: "POST",
      body: JSON.stringify({
        sequence: Number(form.get("sequence")) || Date.now(),
        mimeType: "audio/wav",
        durationMs: 5000,
        transcriptText: form.get("transcriptText")
      })
    });
    if (response.success) {
      await loadTranscriptTurns(ambientSession.id);
      setMessage(`Transcript event created ${response.data.transcriptTurns.length} turn(s).`);
      event.currentTarget.reset();
    } else {
      setMessage(response.error.message);
    }
  }

  async function loadTranscriptTurns(sessionId = ambientSession?.id) {
    if (!sessionId) return;
    const response = await apiRequest<{ transcriptTurns: TranscriptTurn[] }>(
      `/ambient-sessions/${sessionId}/transcript-turns`
    );
    if (response.success) {
      setTranscriptTurns(response.data.transcriptTurns);
    } else {
      setMessage(response.error.message);
    }
  }

  async function correctTranscriptTurn(event: FormEvent<HTMLFormElement>, turnId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await apiRequest<{ transcriptTurn: TranscriptTurn }>(
      `/transcript-turns/${turnId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          speakerLabel: form.get("speakerLabel"),
          speakerRoleGuess: form.get("speakerRoleGuess"),
          text: form.get("text")
        })
      }
    );
    if (response.success) {
      setTranscriptTurns((current) =>
        current.map((turn) => (turn.id === turnId ? response.data.transcriptTurn : turn))
      );
      setEditingTurnId(null);
      setMessage("Transcript turn corrected.");
    } else {
      setMessage(response.error.message);
    }
  }

  async function runSynthesisTick() {
    if (!ambientSession) return;
    setMessage("Running Gemini synthesis tick...");
    const response = await apiRequest(`/ambient-sessions/${ambientSession.id}/synthesis-ticks`, {
      method: "POST",
      body: JSON.stringify({ triggerReason: "manual_frontend" })
    });
    if (response.success) {
      await loadAiOutputs(ambientSession.id);
      setMessage("Synthesis tick completed. Draft artifacts are ready for review.");
    } else {
      setMessage(response.error.message);
    }
  }

  async function loadAiOutputs(sessionId = ambientSession?.id) {
    if (!sessionId) return;
    const [artifactsResponse, highlightsResponse, suggestionsResponse] = await Promise.all([
      apiRequest<{ summaries: SummaryRevision[] }>(`/ambient-sessions/${sessionId}/artifacts`),
      apiRequest<{ highlightCards: HighlightCard[] }>(`/ambient-sessions/${sessionId}/highlights`),
      apiRequest<{ suggestions: Suggestion[] }>(`/ambient-sessions/${sessionId}/suggestions`)
    ]);
    if (artifactsResponse.success) setSummaries(artifactsResponse.data.summaries);
    if (highlightsResponse.success) setHighlights(highlightsResponse.data.highlightCards);
    if (suggestionsResponse.success) setSuggestions(suggestionsResponse.data.suggestions);
    const failure = [artifactsResponse, highlightsResponse, suggestionsResponse].find(
      (response) => !response.success
    );
    if (failure && !failure.success) setMessage(failure.error.message);
  }

  async function updateSuggestion(suggestionId: string, status: string) {
    const response = await apiRequest<{ suggestion: Suggestion }>(`/suggestions/${suggestionId}`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    if (response.success) {
      setSuggestions((current) =>
        current.map((suggestion) =>
          suggestion.id === suggestionId
            ? { ...suggestion, status: response.data.suggestion.status }
            : suggestion
        )
      );
      setMessage(`Suggestion marked ${status}.`);
    } else {
      setMessage(response.error.message);
    }
  }

  async function recordSuggestionResult(event: FormEvent<HTMLFormElement>, suggestion: Suggestion) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const selectedValue = String(form.get("selectedOptionValue") ?? "");
    const selectedOption = suggestion.resultOptions.find(
      (option) => option.value === selectedValue
    );
    const response = await apiRequest(`/suggestions/${suggestion.id}/results`, {
      method: "POST",
      body: JSON.stringify({
        selectedOptionValue: selectedOption?.value,
        selectedOptionLabel: selectedOption?.label,
        freeTextNote: form.get("freeTextNote") || undefined,
        contextImpact: { recordedFrom: "encounter_capture_ui" }
      })
    });
    if (response.success) {
      await loadAiOutputs();
      setMessage("Suggestion result recorded.");
      event.currentTarget.reset();
    } else {
      setMessage(response.error.message);
    }
  }

  const audioConsent = latestConsentStatus(encounter, "audio");
  const transcriptConsent = latestConsentStatus(encounter, "transcript");
  const aiConsent = latestConsentStatus(encounter, "ai");
  const mediaConsent = latestConsentStatus(encounter, "media");

  return (
    <div className="grid">
      <div className="topbar">
        <div>
          <h1 className="page-title">ANC Encounter Capture</h1>
          <p className="muted">
            Create patient scope, record consent, and capture structured context.
          </p>
        </div>
        <span className="status">{encounter ? encounter.status : "No encounter selected"}</span>
      </div>

      {message ? <p className="panel">{message}</p> : null}

      <div className="grid two-col">
        <section className="panel">
          <h2>Patient Scope</h2>
          <form className="form-grid" onSubmit={searchPatients}>
            <div className="field">
              <label htmlFor="search">Search patient</label>
              <input
                id="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name or hospital number"
              />
            </div>
            <button className="button secondary" type="submit">
              Search
            </button>
          </form>
          <div className="record-list">
            {patients.map((patient) => (
              <button
                className="record record-button"
                key={patient.id}
                onClick={() => choosePatient(patient)}
                type="button"
              >
                <strong>{patient.fullName}</strong>
                <span className="muted">{patient.hospitalNumber}</span>
              </button>
            ))}
          </div>
          <form className="form-grid stacked-form" onSubmit={createPatient}>
            <div className="field">
              <label htmlFor="hospitalNumber">Hospital number</label>
              <input id="hospitalNumber" name="hospitalNumber" required />
            </div>
            <div className="field">
              <label htmlFor="fullName">Full name</label>
              <input id="fullName" name="fullName" required />
            </div>
            <div className="field">
              <label htmlFor="phone">Phone</label>
              <input id="phone" name="phone" />
            </div>
            <button className="button" type="submit">
              Create patient
            </button>
          </form>
        </section>

        <section className="panel">
          <h2>Pregnancy And Encounter</h2>
          <p className="muted">
            {selectedPatient
              ? `Selected patient: ${selectedPatient.fullName}`
              : "Select or create a patient first."}
          </p>
          <div className="record-list">
            {episodes.map((episode) => (
              <button
                className="record record-button"
                key={episode.id}
                onClick={() => setSelectedEpisode(episode)}
                type="button"
              >
                <strong>{episode.label}</strong>
                <span className="muted">{episode.status}</span>
              </button>
            ))}
          </div>
          <form className="form-grid stacked-form" onSubmit={createEpisode}>
            <div className="field">
              <label htmlFor="episodeLabel">Episode label</label>
              <input id="episodeLabel" name="label" required />
            </div>
            <div className="field">
              <label htmlFor="gestationalAgeWeeks">Gestational age weeks</label>
              <input
                id="gestationalAgeWeeks"
                name="gestationalAgeWeeks"
                type="number"
                min="0"
                max="45"
              />
            </div>
            <button className="button secondary" disabled={!selectedPatient} type="submit">
              Create episode
            </button>
          </form>
          <div className="button-row">
            <button
              className="button"
              disabled={!selectedPatient || !selectedEpisode}
              onClick={createEncounter}
              type="button"
            >
              Create encounter
            </button>
            {encounterStatuses.map((status) => (
              <button
                className="button secondary"
                disabled={!encounter || encounter.status === status}
                key={status}
                onClick={() => transitionEncounter(status)}
                type="button"
              >
                {status}
              </button>
            ))}
          </div>
        </section>
      </div>

      {encounter ? (
        <div className="grid two-col">
          <section className="panel">
            <h2>Consent And Files</h2>
            <form className="form-grid" onSubmit={recordConsent}>
              <div className="field">
                <label htmlFor="mode">Processing mode</label>
                <select id="mode" name="mode">
                  {consentModes.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="status">Consent status</label>
                <select id="status" name="status">
                  {consentStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="note">Consent note</label>
                <input id="note" name="note" />
              </div>
              <button className="button" type="submit">
                Record consent
              </button>
            </form>
            <form className="form-grid stacked-form" onSubmit={addFileMetadata}>
              <div className="field">
                <label htmlFor="kind">File kind</label>
                <select id="kind" name="kind">
                  {clinicalFileKinds.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="fileName">File name</label>
                <input id="fileName" name="fileName" required />
              </div>
              <div className="field">
                <label htmlFor="mimeType">MIME type</label>
                <input
                  id="mimeType"
                  name="mimeType"
                  defaultValue="application/octet-stream"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="sizeBytes">Size bytes</label>
                <input id="sizeBytes" name="sizeBytes" type="number" min="0" defaultValue="0" />
              </div>
              <button className="button secondary" type="submit">
                Save metadata
              </button>
            </form>
          </section>

          <section className="panel">
            <h2>Observations And Session Note</h2>
            <form className="form-grid" onSubmit={addObservation}>
              <div className="field">
                <label htmlFor="type">Observation type</label>
                <select id="type" name="type">
                  {observationTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="label">Label</label>
                <input id="label" name="label" required />
              </div>
              <div className="field">
                <label htmlFor="value">Value</label>
                <input id="value" name="value" required />
              </div>
              <button className="button" type="submit">
                Add observation
              </button>
            </form>
            <div className="field stacked-form">
              <label htmlFor="sessionNote">Session note</label>
              <textarea
                id="sessionNote"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
              <button className="button" onClick={saveNote} type="button">
                Save note
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {encounter ? (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Medical Evidence</h2>
              <p className="muted">
                Media consent: {mediaConsent}. AI consent: {aiConsent}. Evidence remains
                review-required; video evidence is processed from uploaded files, not live camera
                capture.
              </p>
            </div>
            <div className="button-row">
              <button
                className="button secondary"
                onClick={() => loadClinicalFiles()}
                type="button"
              >
                Refresh files
              </button>
              <button
                className="button secondary"
                disabled={!ambientSession}
                onClick={() => loadEvidence()}
                type="button"
              >
                Refresh evidence
              </button>
            </div>
          </div>
          <div className="grid two-col">
            <div className="record-list">
              <form className="form-grid" onSubmit={uploadClinicalFile}>
                <div className="form-grid inline-grid">
                  <div className="field">
                    <label htmlFor="upload-kind">File kind</label>
                    <select id="upload-kind" name="kind">
                      {clinicalFileKinds.map((kind) => (
                        <option key={kind} value={kind}>
                          {kind}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="sourceLabel">Source label</label>
                    <input
                      id="sourceLabel"
                      name="sourceLabel"
                      placeholder="Lab page, uploaded ultrasound video"
                    />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="clinicalUpload">Upload evidence file</label>
                  <input id="clinicalUpload" name="file" type="file" required />
                </div>
                <button className="button" type="submit">
                  Upload file
                </button>
              </form>
              <div className="record-list">
                {clinicalFiles.length === 0 ? (
                  <p className="muted">No uploaded evidence files.</p>
                ) : (
                  clinicalFiles.map((file) => (
                    <article className="record" key={file.id}>
                      <div className="record-topline">
                        <strong>{file.fileName}</strong>
                        <span className="status">{file.kind}</span>
                      </div>
                      <p className="muted">
                        {file.mimeType}
                        {file.sizeBytes ? ` | ${file.sizeBytes} bytes` : ""}
                      </p>
                      {file.checksumSha256 ? (
                        <p className="muted">sha256 {file.checksumSha256.slice(0, 12)}</p>
                      ) : null}
                      <div className="button-row">
                        <button
                          className="button secondary"
                          onClick={() => sampleFrames(file.id)}
                          type="button"
                        >
                          Sample frames
                        </button>
                      </div>
                      {file.frameSamples?.length ? (
                        <p className="muted">
                          {file.frameSamples.length} sample(s), latest{" "}
                          {file.frameSamples[0]?.processingStatus}
                        </p>
                      ) : null}
                    </article>
                  ))
                )}
              </div>
            </div>
            <div className="record-list">
              <form className="form-grid" onSubmit={createEvidenceHandoff}>
                <div className="field">
                  <label htmlFor="clinicalFileId">Evidence file</label>
                  <select id="clinicalFileId" name="clinicalFileId">
                    <option value="">No file selected</option>
                    {clinicalFiles.map((file) => (
                      <option key={file.id} value={file.id}>
                        {file.fileName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="taskType">Task</label>
                  <select id="taskType" name="taskType" defaultValue="visible_finding_description">
                    <option value="visible_finding_description">visible finding</option>
                    <option value="lab_value_extraction">lab extraction</option>
                    <option value="document_extraction">document extraction</option>
                    <option value="ultrasound_frame_adequacy">ultrasound adequacy</option>
                    <option value="media_summary">media summary</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="exactQuestion">Question</label>
                  <textarea
                    id="exactQuestion"
                    name="exactQuestion"
                    defaultValue="Describe visible evidence and limitations for clinician review."
                    required
                  />
                </div>
                <button className="button" disabled={!ambientSession} type="submit">
                  Create handoff
                </button>
              </form>
              <h3>Handoffs</h3>
              {evidenceHandoffs.length === 0 ? (
                <p className="muted">No evidence handoffs yet.</p>
              ) : (
                evidenceHandoffs.map((handoff) => (
                  <article className="record" key={handoff.id}>
                    <div className="record-topline">
                      <strong>{handoff.taskType}</strong>
                      <span className="status">{handoff.status}</span>
                    </div>
                    <p>{handoff.exactQuestion}</p>
                    <p className="muted">
                      {handoff.provider} | {handoff.model}
                    </p>
                    {handoff.failureReason ? (
                      <p className="error">{handoff.failureReason}</p>
                    ) : null}
                    <button
                      className="button secondary"
                      disabled={handoff.status === "running"}
                      onClick={() => runEvidenceHandoff(handoff.id)}
                      type="button"
                    >
                      Run analysis
                    </button>
                  </article>
                ))
              )}
              <h3>Findings</h3>
              {evidenceFindings.length === 0 ? (
                <p className="muted">No evidence findings yet.</p>
              ) : (
                evidenceFindings.map((finding) => (
                  <article className="record" key={finding.id}>
                    <div className="record-topline">
                      <strong>{finding.taskType}</strong>
                      <span className="status">review required</span>
                    </div>
                    {finding.findings.map((text) => (
                      <p key={text}>{text}</p>
                    ))}
                    {finding.extractedValues.length ? (
                      <dl className="compact-facts">
                        {finding.extractedValues.slice(0, 3).map((value) => (
                          <div key={`${value.label}-${value.value}`}>
                            <dt>{value.label}</dt>
                            <dd>
                              {value.value}
                              {value.unit ? ` ${value.unit}` : ""}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                    <p className="muted">Confidence {Math.round(finding.confidence * 100)}%</p>
                    {finding.uncertaintyReasons.concat(finding.qualityLimitations).map((reason) => (
                      <p className="status warning-status" key={reason}>
                        {reason}
                      </p>
                    ))}
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      ) : null}

      {encounter ? (
        <section className="panel">
          <h2>Encounter Overview</h2>
          <div className="summary-grid">
            <div>
              <strong>Consent records</strong>
              <p className="muted">{encounter.consentRecords?.length ?? 0}</p>
            </div>
            <div>
              <strong>Observations</strong>
              <p className="muted">{encounter.observations?.length ?? 0}</p>
            </div>
            <div>
              <strong>Files</strong>
              <p className="muted">{encounter.clinicalFiles?.length ?? 0}</p>
            </div>
            <div>
              <strong>Session note version</strong>
              <p className="muted">{encounter.sessionNote?.version ?? 0}</p>
            </div>
          </div>
        </section>
      ) : null}

      {encounter ? (
        <div className="grid two-col">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Deterministic Rules</h2>
                <p className="muted">Advisory preflight is separate from ambient AI synthesis.</p>
              </div>
              <button className="button" onClick={runPreflight} type="button">
                Run preflight
              </button>
            </div>
            <div className="record-list">
              {ruleResults.length === 0 ? (
                <p className="muted">No rule results loaded for this encounter.</p>
              ) : (
                ruleResults.map((rule) => (
                  <article className={`record severity-${rule.severity}`} key={rule.id}>
                    <div className="record-topline">
                      <strong>{rule.ruleId}</strong>
                      <span className="status">{rule.status}</span>
                    </div>
                    <p>{rule.suggestedAction}</p>
                    <dl className="compact-facts">
                      <div>
                        <dt>Severity</dt>
                        <dd>{rule.severity}</dd>
                      </div>
                      <div>
                        <dt>Blocking</dt>
                        <dd>{rule.blockingLevel}</dd>
                      </div>
                      <div>
                        <dt>Confidence</dt>
                        <dd>{Math.round(rule.confidence * 100)}%</dd>
                      </div>
                    </dl>
                    <p className="muted">{rule.thresholdDescription}</p>
                    {rule.needsLocalGuidelineValidation ? (
                      <p className="status warning-status">Needs local guideline validation</p>
                    ) : null}
                    <div className="button-row">
                      <button
                        className="button secondary"
                        disabled={rule.status !== "active"}
                        onClick={() => updateRuleResult(rule.id, "acknowledged")}
                        type="button"
                      >
                        Acknowledge
                      </button>
                      <button
                        className="button secondary"
                        disabled={rule.status !== "active"}
                        onClick={() => updateRuleResult(rule.id, "resolved")}
                        type="button"
                      >
                        Resolve
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Ambient Session</h2>
                <p className="muted">
                  Audio consent: {audioConsent}. Transcript consent: {transcriptConsent}. AI
                  consent: {aiConsent}.
                </p>
              </div>
              <span className="status">{ambientSession?.status ?? "not created"}</span>
            </div>
            <div className="button-row">
              <button className="button" onClick={createAmbientSession} type="button">
                Create session
              </button>
              <button
                className="button secondary"
                disabled={!ambientSession}
                onClick={startAmbientSession}
                type="button"
              >
                Start
              </button>
              <button
                className="button secondary"
                disabled={!ambientSession}
                onClick={stopAmbientSession}
                type="button"
              >
                Stop
              </button>
              <button
                className="button secondary"
                disabled={!ambientSession}
                onClick={() => loadTranscriptTurns()}
                type="button"
              >
                Refresh transcript
              </button>
            </div>
            {ambientSession?.failureReason ? (
              <p className="error">STT degraded: {ambientSession.failureReason}</p>
            ) : null}
            <form className="form-grid stacked-form" onSubmit={submitMockAudioEvent}>
              <div className="field">
                <label htmlFor="sequence">Audio event sequence</label>
                <input id="sequence" name="sequence" type="number" min="1" defaultValue="1" />
              </div>
              <div className="field">
                <label htmlFor="transcriptText">Mock transcript text</label>
                <textarea
                  id="transcriptText"
                  name="transcriptText"
                  defaultValue="Clinician: Any bleeding today? Patient: No bleeding, I am 24 weeks."
                />
              </div>
              <button className="button" disabled={!ambientSession} type="submit">
                Submit mock audio event
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {encounter ? (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Gemini Draft Artifacts</h2>
              <p className="muted">Draft synthesis requires AI consent and clinician review.</p>
            </div>
            <div className="button-row">
              <button
                className="button"
                disabled={!ambientSession}
                onClick={runSynthesisTick}
                type="button"
              >
                Run synthesis
              </button>
              <button
                className="button secondary"
                disabled={!ambientSession}
                onClick={() => loadAiOutputs()}
                type="button"
              >
                Refresh drafts
              </button>
            </div>
          </div>
          <div className="grid two-col">
            <div className="record-list">
              <h3>Progressive Summary</h3>
              {summaries.length === 0 ? (
                <p className="muted">No summary draft yet.</p>
              ) : (
                summaries.slice(0, 1).map((summary) => (
                  <article className="record" key={summary.id}>
                    <p>{summary.content}</p>
                    <p className="muted">
                      Confidence{" "}
                      {summary.confidence ? `${Math.round(summary.confidence * 100)}%` : "not set"}
                    </p>
                  </article>
                ))
              )}
              <h3>Highlights</h3>
              {highlights.length === 0 ? (
                <p className="muted">No highlight cards yet.</p>
              ) : (
                highlights.map((highlight) => (
                  <article className={`record severity-${highlight.severity}`} key={highlight.id}>
                    <div className="record-topline">
                      <strong>{highlight.title}</strong>
                      <span className="status">{highlight.type}</span>
                    </div>
                    <p>{highlight.body}</p>
                    <p className="muted">Confidence {Math.round(highlight.confidence * 100)}%</p>
                  </article>
                ))
              )}
            </div>
            <div className="record-list">
              <h3>Suggestions</h3>
              {suggestions.length === 0 ? (
                <p className="muted">No suggestions yet.</p>
              ) : (
                suggestions.map((suggestion) => (
                  <article className="record" key={suggestion.id}>
                    <div className="record-topline">
                      <strong>{suggestion.title}</strong>
                      <span className="status">{suggestion.status}</span>
                    </div>
                    <p>{suggestion.rationale}</p>
                    <p className="muted">Priority {suggestion.priority}</p>
                    <div className="button-row">
                      <button
                        className="button secondary"
                        onClick={() => updateSuggestion(suggestion.id, "done")}
                        type="button"
                      >
                        Done
                      </button>
                      <button
                        className="button secondary"
                        onClick={() => updateSuggestion(suggestion.id, "skipped")}
                        type="button"
                      >
                        Skip
                      </button>
                      <button
                        className="button secondary"
                        onClick={() => updateSuggestion(suggestion.id, "needs_follow_up")}
                        type="button"
                      >
                        Follow-up
                      </button>
                    </div>
                    <form
                      className="form-grid stacked-form"
                      onSubmit={(event) => recordSuggestionResult(event, suggestion)}
                    >
                      <div className="field">
                        <label htmlFor={`result-${suggestion.id}`}>Result</label>
                        <select id={`result-${suggestion.id}`} name="selectedOptionValue">
                          {suggestion.resultOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label htmlFor={`result-note-${suggestion.id}`}>Result note</label>
                        <input id={`result-note-${suggestion.id}`} name="freeTextNote" />
                      </div>
                      <button className="button secondary" type="submit">
                        Record result
                      </button>
                    </form>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      ) : null}

      {encounter ? (
        <section className="panel">
          <h2>Live Transcript</h2>
          <div className="record-list">
            {transcriptTurns.length === 0 ? (
              <p className="muted">No transcript turns recorded yet.</p>
            ) : (
              transcriptTurns.map((turn) => (
                <article className="record transcript-turn" key={turn.id}>
                  {editingTurnId === turn.id ? (
                    <form
                      className="form-grid"
                      onSubmit={(event) => correctTranscriptTurn(event, turn.id)}
                    >
                      <div className="form-grid inline-grid">
                        <div className="field">
                          <label htmlFor={`speaker-${turn.id}`}>Speaker label</label>
                          <input
                            id={`speaker-${turn.id}`}
                            name="speakerLabel"
                            defaultValue={turn.speakerLabel}
                          />
                        </div>
                        <div className="field">
                          <label htmlFor={`role-${turn.id}`}>Speaker role</label>
                          <select
                            id={`role-${turn.id}`}
                            name="speakerRoleGuess"
                            defaultValue={turn.speakerRoleGuess}
                          >
                            <option value="clinician">clinician</option>
                            <option value="patient">patient</option>
                            <option value="companion">companion</option>
                            <option value="unknown">unknown</option>
                          </select>
                        </div>
                      </div>
                      <div className="field">
                        <label htmlFor={`text-${turn.id}`}>Transcript text</label>
                        <textarea id={`text-${turn.id}`} name="text" defaultValue={turn.text} />
                      </div>
                      <div className="button-row">
                        <button className="button" type="submit">
                          Save correction
                        </button>
                        <button
                          className="button secondary"
                          onClick={() => setEditingTurnId(null)}
                          type="button"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="record-topline">
                        <strong>
                          {turn.speakerLabel} | {turn.speakerRoleGuess}
                        </strong>
                        <span className="status">{turn.correctionStatus}</span>
                      </div>
                      <p>{turn.text}</p>
                      <p className="muted">
                        {formatMs(turn.startTimeMs)} to {formatMs(turn.endTimeMs)}
                        {turn.sttConfidence
                          ? ` | STT ${Math.round(turn.sttConfidence * 100)}%`
                          : ""}
                      </p>
                      <button
                        className="button secondary"
                        onClick={() => setEditingTurnId(turn.id)}
                        type="button"
                      >
                        Correct turn
                      </button>
                    </>
                  )}
                </article>
              ))
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function numericOrString(value: string) {
  return value !== "" && Number.isFinite(Number(value)) ? Number(value) : value;
}

function latestConsentStatus(encounter: Encounter | null, mode: string) {
  return encounter?.consentRecords.find((record) => record.mode === mode)?.status ?? "missing";
}

function formatMs(value: number) {
  return `${(value / 1000).toFixed(1)}s`;
}
