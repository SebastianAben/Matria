"use client";

import { CalendarClock, CheckCircle2, ClipboardList, FileText, PlayCircle } from "lucide-react";
import {
  ActionButton,
  Badge,
  DataTable,
  Field,
  KeyValueList,
  PageHeader,
  Panel,
  PatientContextBar,
  StatTile,
  Timeline
} from "../../components/clinical-ui";
import { encounter, episodes, patient, pregnancy, recentEncounters } from "../../components/demo-data";

export default function EncounterSetupPage() {
  return (
    <main className="screen">
      <PageHeader
        eyebrow="Clinical workspace"
        title="Encounter Setup"
        description="Confirm patient context, consent, and encounter scope before starting ambient capture."
        actions={
          <>
            <ActionButton tone="secondary">
              <FileText size={15} />
              Prior note
            </ActionButton>
            <ActionButton>
              <PlayCircle size={15} />
              Start encounter
            </ActionButton>
          </>
        }
      />

      <div className="clinical-grid">
        <PatientContextBar />

        <div className="clinical-grid grid-main-aside">
          <div className="clinical-grid">
            <Panel title="Current Pregnancy" subtitle="Active episode context selected for this encounter.">
              <div className="stat-row">
                <StatTile label="Episode" value={pregnancy.label} detail={pregnancy.pathway} icon={<ClipboardList size={16} />} />
                <StatTile label="Gestational age" value={pregnancy.gestationalAge} detail="By LMP" icon={<CalendarClock size={16} />} />
                <StatTile label="EDD" value="05 Aug" detail={pregnancy.edd} />
                <StatTile label="Status" value={pregnancy.status} detail={encounter.facility} icon={<CheckCircle2 size={16} />} />
              </div>
            </Panel>

            <Panel title="Episode Selection" subtitle="Only one episode can be active for an ANC encounter.">
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

            <Panel title="Recent Encounters" subtitle="Used for clinical continuity and duplicate visit checks.">
              <DataTable columns={["Visit", "Date", "Status", "Clinician"]} rows={recentEncounters} />
            </Panel>

            <Panel title="Last Note Snapshot">
              <div className="note-box">
                <h3>ANC Follow-up · 2025-07-15</h3>
                <p>
                  Patient reported intermittent lower back discomfort without bleeding or fluid leakage.
                  Blood pressure stable. Counselled on warning signs and scheduled follow-up in two weeks.
                </p>
              </div>
            </Panel>
          </div>

          <div className="clinical-grid">
            <Panel title="Encounter Details" subtitle="Setup mirrors the reference form before live capture.">
              <form className="form-grid">
                <Field label="Visit type">
                  <select defaultValue="anc-follow-up">
                    <option value="anc-follow-up">ANC Follow-up</option>
                    <option value="initial">ANC Initial Visit</option>
                    <option value="postpartum">Postpartum</option>
                  </select>
                </Field>
                <Field label="Facility">
                  <input defaultValue={encounter.facility} />
                </Field>
                <Field label="Clinician">
                  <input defaultValue={encounter.clinician} />
                </Field>
                <Field label="Date">
                  <input type="date" defaultValue={encounter.date} />
                </Field>
                <Field label="Consent mode">
                  <select defaultValue="verbal">
                    <option value="verbal">Verbal consent</option>
                    <option value="written">Written consent</option>
                  </select>
                </Field>
                <Field label="Ambient capture">
                  <select defaultValue="enabled">
                    <option value="enabled">Enabled after consent</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </Field>
                <Field label="Reason for visit">
                  <textarea defaultValue="Routine ANC follow-up, review intermittent abdominal tightness and recent urine dip result." />
                </Field>
              </form>
            </Panel>

            <Panel title="Risk and Readiness">
              <div className="state-stack">
                <div className="state-card">
                  <div className="button-cluster">
                    <strong>Preterm labor screen</strong>
                    <Badge tone="amber">Watch</Badge>
                  </div>
                  <p>Intermittent abdominal tightening requires targeted questions during capture.</p>
                </div>
                <div className="state-card">
                  <div className="button-cluster">
                    <strong>Consent</strong>
                    <Badge tone="green">Ready</Badge>
                  </div>
                  <p>Verbal consent can be recorded at encounter start.</p>
                </div>
                <div className="state-card">
                  <div className="button-cluster">
                    <strong>Referral / FHIR</strong>
                    <Badge tone="gray">Draft only</Badge>
                  </div>
                  <p>Export surfaces remain review-only until later finalization.</p>
                </div>
              </div>
            </Panel>

            <Panel title="Patient Context">
              <KeyValueList
                items={[
                  ["Patient", patient.fullName],
                  ["MRN", patient.mrn],
                  ["Phone", patient.phone],
                  ["Clinic", patient.clinic],
                  ["Pregnancy", `${pregnancy.label}, ${pregnancy.gestationalAge}`],
                  ["EDD", pregnancy.edd]
                ]}
              />
            </Panel>

            <Panel title="Setup Activity">
              <Timeline
                items={[
                  ["10:02", "Patient confirmed", "MRN and DOB matched with registry."],
                  ["10:04", "Episode selected", "Active ANC episode chosen for this visit."],
                  ["10:05", "Capture ready", "Consent prompt queued for clinician."]
                ]}
              />
            </Panel>
          </div>
        </div>
      </div>
    </main>
  );
}
