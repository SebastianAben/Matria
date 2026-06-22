"use client";

import { FormEvent, useMemo, useState } from "react";
import { AlertCircle, Loader2, Plus, Search, UserPlus } from "lucide-react";
import { apiRequest } from "../../lib/api";
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
import { episodes, patient, recentEncounters, searchResults } from "../components/demo-data";

type PatientRecord = {
  id?: string;
  hospitalNumber: string;
  fullName: string;
  phone?: string | null;
};

type SearchMode = "results" | "empty" | "loading" | "error" | "duplicate";

export default function PatientsPage() {
  const [query, setQuery] = useState("alya");
  const [mode, setMode] = useState<SearchMode>("results");
  const [createdPatient, setCreatedPatient] = useState<PatientRecord | null>(null);
  const [message, setMessage] = useState("Exact and likely duplicate matches are shown before registration.");

  const rows = useMemo(() => {
    if (createdPatient) {
      return [
        [
          createdPatient.fullName,
          createdPatient.hospitalNumber,
          "ANC Clinic 2",
          "Not recorded",
          "-",
          createdPatient.phone ?? "-",
          "No episode",
          "-",
          "New"
        ],
        ...searchResults
      ];
    }
    return searchResults;
  }, [createdPatient]);

  async function runSearch(event?: FormEvent) {
    event?.preventDefault();
    if (mode === "loading") return;
    setMode("loading");
    setMessage("Searching registry and recent ANC encounters...");
    const response = await apiRequest<{ patients: PatientRecord[] }>(
      `/patients?search=${encodeURIComponent(query)}`
    );
    if (response.success && response.data.patients.length > 0) {
      const liveRows = response.data.patients.map((item) => [
        item.fullName,
        item.hospitalNumber,
        "Live registry",
        "-",
        "-",
        item.phone ?? "-",
        "Select to load",
        "-",
        "Exact"
      ]);
      searchResults.splice(0, searchResults.length, ...(liveRows as typeof searchResults));
      setMode("results");
      setMessage(`${response.data.patients.length} live patient match${response.data.patients.length === 1 ? "" : "es"} found.`);
      return;
    }
    if (response.success) {
      setMode("empty");
      setMessage("No live match found. Demo fallback remains available for design review.");
      return;
    }
    setMode("error");
    setMessage(response.error.message);
  }

  async function createPatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      hospitalNumber: String(form.get("hospitalNumber") ?? ""),
      fullName: String(form.get("fullName") ?? ""),
      phone: String(form.get("phone") ?? "") || undefined
    };
    const response = await apiRequest<{ patient: PatientRecord }>("/patients", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    if (response.success) {
      setCreatedPatient(response.data.patient);
      setMode("duplicate");
      setMessage("Patient created. Duplicate review remains visible before episode setup.");
    } else {
      setCreatedPatient(payload);
      setMode("duplicate");
      setMessage("Demo patient staged because the live API was unavailable.");
    }
  }

  return (
    <main className="screen patients-screen">
      <PageHeader
        eyebrow="Patient registry"
        title="Patient Search / Registration"
        description={message}
        actions={
          <>
            <ActionButton tone="secondary">
              <Search size={15} />
              Advanced search
            </ActionButton>
            <ActionButton>
              <UserPlus size={15} />
              New patient
            </ActionButton>
          </>
        }
      />

      <div className="clinical-grid grid-main-aside">
        <div className="clinical-grid">
          <Panel title="Search and Match Review" subtitle="Search by MRN, name, phone, or national ID.">
            <form className="filters-row" onSubmit={runSearch}>
              <Field label="Search">
                <input value={query} onChange={(event) => setQuery(event.target.value)} />
              </Field>
              <Field label="Facility">
                <select defaultValue="anc-clinic-2">
                  <option value="anc-clinic-2">ANC Clinic 2</option>
                  <option value="rsia-melati">RSIA Melati</option>
                </select>
              </Field>
              <Field label="Match mode">
                <select defaultValue="all">
                  <option value="all">All matches</option>
                  <option value="exact">Exact only</option>
                  <option value="duplicate">Potential duplicates</option>
                </select>
              </Field>
              <ActionButton type="submit">
                <Search size={15} />
                Search
              </ActionButton>
            </form>
          </Panel>

          <Panel
            title="Patient Results"
            subtitle="Potential duplicates stay in the review lane until a clinician chooses the correct record."
            actions={
              <div className="segmented" aria-label="Search state examples">
                {(["results", "empty", "loading", "error", "duplicate"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={mode === item ? "active" : ""}
                    onClick={() => setMode(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            }
          >
            {mode === "loading" ? (
              <EmptyState
                title="Searching records"
                description="Registry, recent encounter, and duplicate indexes are being checked."
                action={<Loader2 size={20} />}
              />
            ) : mode === "empty" ? (
              <EmptyState
                title="No patient match"
                description="Start a new registration after confirming name, birth date, and national ID."
                action={<ActionButton tone="secondary"><Plus size={15} /> Start registration</ActionButton>}
              />
            ) : mode === "error" ? (
              <EmptyState
                title="Search unavailable"
                description="Use the registration form only when the patient identity is confirmed."
                action={<AlertCircle size={20} />}
              />
            ) : (
              <DataTable
                columns={["Patient", "MRN", "Facility", "DOB", "Age", "Phone", "Episode", "Context", "Match"]}
                rows={rows}
                renderCell={(cell, index) => {
                  if (index === 8) {
                    const tone = cell === "Exact" || cell === "New" ? "green" : cell === "High" ? "amber" : "gray";
                    return <Badge tone={tone}>{cell}</Badge>;
                  }
                  return cell;
                }}
              />
            )}
          </Panel>

          <div className="patient-state-grid">
            <div className="state-card">
              <strong>No patients matched</strong>
              <p>Try adjusting the search or create a new patient.</p>
              <ActionButton tone="secondary" type="button"><Plus size={15} />Create New Patient</ActionButton>
            </div>
            <div className="state-card loading-card">
              <strong>Loading results</strong>
              <p>Registry and recent patient indexes are being checked.</p>
              <div className="skeleton-line" />
              <div className="skeleton-line short" />
            </div>
            <div className="state-card error-card">
              <strong>Search error</strong>
              <p>We could not complete your search due to a connection issue.</p>
              <ActionButton tone="danger" type="button">Retry Search</ActionButton>
            </div>
          </div>

          <div className="duplicate-card">
            <strong>Possible duplicate detected</strong>
            <p>A patient with similar details already exists. Review matches before confirming a new patient.</p>
            <div className="duplicate-row">
              <span>Alya Prameswari · MRN 281904</span>
              <span>12 Aug 1992</span>
              <span>0812 3456 7890</span>
              <ActionButton tone="ghost" type="button">View match</ActionButton>
            </div>
          </div>

          <Panel title="Patient Detail" subtitle="Selected demographic and ANC context.">
            <div className="stat-row">
              <StatTile label="MRN" value={patient.hospitalNumber} detail="Hospital number" />
              <StatTile label="Age" value={patient.age} detail={patient.dobDisplay} />
              <StatTile label="Blood" value={patient.bloodType} detail="Verified" />
              <StatTile label="Episode" value="Active" detail="28w 4d" />
            </div>
          </Panel>
        </div>

        <div className="clinical-grid">
          <Panel title="Selected Patient" subtitle="Safe identity match" actions={<ActionButton tone="ghost" type="button">Edit</ActionButton>}>
            <div className="selected-patient-card">
              <div className="patient-avatar">{patient.initials}</div>
              <div>
                <strong>{patient.fullName}</strong>
                <p>{patient.mrn} · {patient.clinic}</p>
                <Badge tone="green">Exact match</Badge>
              </div>
            </div>
            <KeyValueList
              items={[
                ["Date of Birth", patient.dobDisplay],
                ["Sex", patient.sex],
                ["Phone", patient.phone],
                ["Address", patient.address],
                ["National ID", patient.nationalId],
                ["Latest Episode", "ANC Follow-up · EDD 2025-08-05"]
              ]}
            />
            <div className="duplicate-card compact">
              <strong>Identity verification passed</strong>
              <p>Name, DOB, and phone match with high confidence.</p>
            </div>
          </Panel>

          <Panel title="Register Patient" subtitle="Create only after duplicate review.">
            <form className="form-grid" onSubmit={createPatient}>
              <Field label="Full name">
                <input name="fullName" defaultValue="Alya Prameswari" />
              </Field>
              <Field label="MRN">
                <input name="hospitalNumber" defaultValue="281904" />
              </Field>
              <Field label="DOB">
                <input name="dob" type="date" defaultValue="1992-08-12" />
              </Field>
              <Field label="Phone">
                <input name="phone" defaultValue="0812 3456 7890" />
              </Field>
              <Field label="National ID">
                <input name="nationalId" defaultValue={patient.nationalId} />
              </Field>
              <Field label="Facility">
                <select name="facility" defaultValue="anc-clinic-2">
                  <option value="anc-clinic-2">ANC Clinic 2</option>
                  <option value="rsia-melati">RSIA Melati</option>
                </select>
              </Field>
              <Field label="Address">
                <textarea name="address" defaultValue={patient.address} />
              </Field>
              <div className="wide button-cluster">
                <ActionButton type="submit">
                  <Plus size={15} />
                  Save patient
                </ActionButton>
                <ActionButton tone="ghost" type="button">
                  Clear
                </ActionButton>
              </div>
            </form>
          </Panel>

          <Panel title="Identity Summary">
            <KeyValueList
              items={[
                ["Name", patient.fullName],
                ["MRN", patient.mrn],
                ["DOB", patient.dobDisplay],
                ["Phone", patient.phone],
                ["Email", patient.email],
                ["Address", patient.address]
              ]}
            />
          </Panel>

          <Panel title="Pregnancy Episodes">
            <div className="episode-list">
              {episodes.map((item, index) => (
                <div className={`episode-card ${index === 0 ? "active" : ""}`} key={item.name}>
                  <div className="button-cluster">
                    <strong>{item.name}</strong>
                    <Badge tone={item.status === "Active" ? "green" : "gray"}>{item.status}</Badge>
                  </div>
                  <p>{item.dates}</p>
                  <p>{item.outcome} · {item.note}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Recent Encounters">
            <DataTable columns={["Type", "Date", "Status", "Clinician"]} rows={recentEncounters} />
          </Panel>
        </div>
      </div>
    </main>
  );
}
