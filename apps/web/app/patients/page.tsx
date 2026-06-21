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
  clinicalFiles: Array<{ id: string; kind: string; fileName: string; mimeType: string }>;
  sessionNote: { id: string; content: string; version: number } | null;
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
    const response = await apiRequest(`/encounters/${encounter.id}/observations`, {
      method: "POST",
      body: JSON.stringify({
        type: form.get("type"),
        value: {
          label: form.get("label"),
          value: form.get("value")
        },
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
    </div>
  );
}
