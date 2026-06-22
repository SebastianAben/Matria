"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Loader2, Plus, Search, UserPlus } from "lucide-react";
import { apiRequest } from "../../lib/api";
import {
  formatDate,
  formatDateTime,
  initials,
  scopedHref,
  type EncounterRecord,
  type PatientRecord,
  type PregnancyEpisode
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
  StatTile
} from "../components/clinical-ui";

type LoadState = "idle" | "loading" | "loaded" | "error";

export default function PatientsPage() {
  const [query, setQuery] = useState("");
  const [searchState, setSearchState] = useState<LoadState>("idle");
  const [message, setMessage] = useState("Search or register a patient to begin an ANC encounter.");
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [episodes, setEpisodes] = useState<PregnancyEpisode[]>([]);
  const [encounters, setEncounters] = useState<EncounterRecord[]>([]);
  const [detailState, setDetailState] = useState<LoadState>("idle");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const patientId = params.get("patientId");
    if (patientId) void loadPatient(patientId);
  }, []);

  async function runSearch(event?: FormEvent) {
    event?.preventDefault();
    if (!query.trim()) {
      setSearchState("idle");
      setPatients([]);
      setMessage("Enter a name or MRN to search the hospital registry.");
      return;
    }
    setSearchState("loading");
    setMessage("Searching patients from the backend registry...");
    const response = await apiRequest<{ patients: PatientRecord[] }>(
      `/patients?search=${encodeURIComponent(query.trim())}`
    );
    if (!response.success) {
      setSearchState("error");
      setMessage(response.error.message);
      return;
    }
    setPatients(response.data.patients);
    setSearchState("loaded");
    setMessage(
      response.data.patients.length === 0
        ? "No backend patient matched this search. Register only after confirming identity."
        : `${response.data.patients.length} backend patient match${response.data.patients.length === 1 ? "" : "es"} found.`
    );
  }

  async function loadPatient(patientId: string) {
    setDetailState("loading");
    const [patientResponse, episodeResponse, encounterResponse] = await Promise.all([
      apiRequest<{ patient: PatientRecord & { pregnancyEpisodes?: PregnancyEpisode[] } }>(
        `/patients/${patientId}`
      ),
      apiRequest<{ pregnancyEpisodes: PregnancyEpisode[] }>(
        `/patients/${patientId}/pregnancy-episodes`
      ),
      apiRequest<{ encounters: EncounterRecord[] }>(`/patients/${patientId}/encounters`)
    ]);
    if (!patientResponse.success) {
      setDetailState("error");
      setMessage(patientResponse.error.message);
      return;
    }
    setSelectedPatient(patientResponse.data.patient);
    setEpisodes(episodeResponse.success ? episodeResponse.data.pregnancyEpisodes : []);
    setEncounters(encounterResponse.success ? encounterResponse.data.encounters : []);
    setDetailState("loaded");
    const next = new URLSearchParams(window.location.search);
    next.set("patientId", patientId);
    window.history.replaceState(null, "", scopedHref("/patients", next));
  }

  async function createPatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setMessage("Creating patient in the backend registry...");
    const payload = {
      hospitalNumber: String(form.get("hospitalNumber") ?? "").trim(),
      fullName: String(form.get("fullName") ?? "").trim(),
      dateOfBirth: String(form.get("dateOfBirth") ?? "") || undefined,
      phone: String(form.get("phone") ?? "").trim() || undefined,
      address: String(form.get("address") ?? "").trim() || undefined
    };
    const response = await apiRequest<{ patient: PatientRecord }>("/patients", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    if (!response.success) {
      setMessage(response.error.message);
      return;
    }
    setPatients((current) => [response.data.patient, ...current]);
    setMessage("Patient created and selected. Create or choose a pregnancy episode next.");
    await loadPatient(response.data.patient.id);
    event.currentTarget.reset();
  }

  const selectedEpisode = episodes[0] ?? null;
  const scopedParams = new URLSearchParams();
  if (selectedPatient) scopedParams.set("patientId", selectedPatient.id);
  if (selectedEpisode) scopedParams.set("pregnancyEpisodeId", selectedEpisode.id);

  return (
    <main className="screen patients-screen">
      <PageHeader
        eyebrow="Patient registry"
        title="Patient Search / Registration"
        description={message}
        actions={
          selectedPatient ? (
            <Link className="action-button primary" href={scopedHref("/workspace/setup", scopedParams)}>
              <Plus size={15} />
              Continue setup
            </Link>
          ) : null
        }
      />

      <div className="clinical-grid grid-main-aside">
        <div className="clinical-grid">
          <Panel title="Search and Match Review" subtitle="Backend search by partial name or hospital number.">
            <form className="filters-row" onSubmit={runSearch}>
              <Field label="Search">
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or MRN" />
              </Field>
              <ActionButton type="submit" disabled={searchState === "loading"}>
                {searchState === "loading" ? <Loader2 size={15} /> : <Search size={15} />}
                Search
              </ActionButton>
            </form>
          </Panel>

          <Panel title="Patient Results" subtitle="Rows appear only after backend search returns.">
            {searchState === "loading" ? (
              <EmptyState title="Searching records" description="Registry results are loading from the API." action={<Loader2 size={20} />} />
            ) : searchState === "error" ? (
              <EmptyState title="Search unavailable" description={message} action={<AlertCircle size={20} />} />
            ) : searchState === "loaded" && patients.length === 0 ? (
              <EmptyState title="No patient match" description="Register a patient only after duplicate review is complete." />
            ) : patients.length === 0 ? (
              <EmptyState title="No search yet" description="Search by name or MRN before selecting a patient." />
            ) : (
              <DataTable
                columns={["Patient", "MRN", "DOB", "Phone", "Status"]}
                rows={patients.map((item) => [
                  <button key={item.id} type="button" className="action-button ghost" onClick={() => loadPatient(item.id)}>
                    {item.fullName}
                  </button>,
                  item.hospitalNumber,
                  formatDate(item.dateOfBirth),
                  item.phone ?? "-",
                  <Badge key={`${item.id}-status`} tone={selectedPatient?.id === item.id ? "green" : "gray"}>
                    {selectedPatient?.id === item.id ? "Selected" : "Registry"}
                  </Badge>
                ])}
              />
            )}
          </Panel>

          <Panel title="Register Patient" subtitle="Creates a backend patient record. No frontend staging is used.">
            <form className="form-grid" onSubmit={createPatient}>
              <Field label="Full name">
                <input name="fullName" required />
              </Field>
              <Field label="MRN">
                <input name="hospitalNumber" required />
              </Field>
              <Field label="Date of birth">
                <input name="dateOfBirth" type="date" />
              </Field>
              <Field label="Phone">
                <input name="phone" />
              </Field>
              <Field label="Address">
                <textarea name="address" />
              </Field>
              <div className="wide button-cluster">
                <ActionButton type="submit">
                  <UserPlus size={15} />
                  Save patient
                </ActionButton>
              </div>
            </form>
          </Panel>
        </div>

        <div className="clinical-grid">
          <Panel title="Selected Patient" subtitle="Loaded from backend after selection.">
            {detailState === "loading" ? (
              <EmptyState title="Loading patient" description="Patient scope is loading from the API." action={<Loader2 size={20} />} />
            ) : selectedPatient ? (
              <>
                <div className="selected-patient-card">
                  <div className="patient-avatar">{initials(selectedPatient.fullName)}</div>
                  <div>
                    <strong>{selectedPatient.fullName}</strong>
                    <p>MRN {selectedPatient.hospitalNumber}</p>
                    <Badge tone="green">Selected</Badge>
                  </div>
                </div>
                <KeyValueList
                  items={[
                    ["Date of Birth", formatDate(selectedPatient.dateOfBirth)],
                    ["Phone", selectedPatient.phone ?? "-"],
                    ["Address", selectedPatient.address ?? "-"],
                    ["Episodes", String(episodes.length)],
                    ["Encounters", String(encounters.length)]
                  ]}
                />
              </>
            ) : (
              <EmptyState title="No patient selected" description="Search or create a patient to load pregnancy episodes and encounters." />
            )}
          </Panel>

          <Panel title="Patient Detail" subtitle="Backend demographics and current scope.">
            <div className="stat-row">
              <StatTile label="MRN" value={selectedPatient?.hospitalNumber ?? "-"} detail="Hospital number" />
              <StatTile label="DOB" value={formatDate(selectedPatient?.dateOfBirth)} detail="Patient supplied" />
              <StatTile label="Episodes" value={String(episodes.length)} detail="Backend records" />
              <StatTile label="Encounters" value={String(encounters.length)} detail="Recent visits" />
            </div>
          </Panel>

          <Panel title="Pregnancy Episodes">
            {selectedPatient && episodes.length === 0 ? (
              <EmptyState
                title="No pregnancy episode"
                description="Create a pregnancy episode in setup before starting an encounter."
                action={
                  <Link className="action-button secondary" href={scopedHref("/workspace/setup", scopedParams)}>
                    Create episode
                  </Link>
                }
              />
            ) : episodes.length === 0 ? (
              <EmptyState title="No patient scope" description="Episodes load after selecting a patient." />
            ) : (
              <div className="episode-list">
                {episodes.map((item) => {
                  const params = new URLSearchParams(scopedParams);
                  params.set("pregnancyEpisodeId", item.id);
                  return (
                    <Link className={`episode-card ${item.status === "active" ? "active" : ""}`} href={scopedHref("/workspace/setup", params)} key={item.id}>
                      <div className="button-cluster">
                        <strong>{item.label}</strong>
                        <Badge tone={item.status === "active" ? "green" : "gray"}>{item.status}</Badge>
                      </div>
                      <p>GA {item.gestationalAgeWeeks == null ? "missing" : `${item.gestationalAgeWeeks}w`} · EDD {formatDate(item.estimatedDueDate)}</p>
                    </Link>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel title="Recent Encounters">
            {encounters.length === 0 ? (
              <EmptyState title="No encounters" description="Create an encounter after selecting or creating a pregnancy episode." />
            ) : (
              <DataTable
                columns={["Visit", "Created", "Status", "Clinician"]}
                rows={encounters.map((item) => {
                  const params = new URLSearchParams(scopedParams);
                  params.set("encounterId", item.id);
                  params.set("pregnancyEpisodeId", item.pregnancyEpisodeId);
                  return [
                    <Link key={item.id} className="action-button ghost" href={scopedHref(item.status === "draft" ? "/workspace/setup" : "/workspace", params)}>
                      {item.visitType}
                    </Link>,
                    formatDateTime(item.createdAt),
                    <Badge key={`${item.id}-status`} tone={item.status === "active" ? "green" : item.status === "reviewing" ? "amber" : "gray"}>{item.status}</Badge>,
                    item.createdBy?.fullName ?? "-"
                  ];
                })}
              />
            )}
          </Panel>
        </div>
      </div>
    </main>
  );
}
