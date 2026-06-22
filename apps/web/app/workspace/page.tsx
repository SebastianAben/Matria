"use client";

import { Mic, Pause, Save, Square, WandSparkles } from "lucide-react";
import { ActionButton, Badge, DataTable, Field, PageHeader, Panel, PatientContextBar, StatTile, Timeline } from "../components/clinical-ui";
import { auditEvents, observations, rules, transcriptTurns } from "../components/demo-data";

export default function WorkspacePage() {
  return (
    <main className="screen">
      <PageHeader
        eyebrow="Ambient encounter"
        title="Clinical Workspace / Live Encounter"
        description="Live capture, observations, deterministic rules, and note drafting for the active ANC visit."
        actions={
          <>
            <ActionButton tone="secondary">
              <Save size={15} />
              Save note
            </ActionButton>
            <ActionButton>
              <WandSparkles size={15} />
              Generate review
            </ActionButton>
          </>
        }
      />

      <div className="clinical-grid">
        <PatientContextBar />

        <div className="ambient-strip">
          <Panel title="Ambient Capture" subtitle="Session active · Indonesian">
            <div className="button-cluster">
              <ActionButton>
                <Mic size={15} />
                Recording
              </ActionButton>
              <ActionButton tone="secondary">
                <Pause size={15} />
                Pause
              </ActionButton>
              <ActionButton tone="ghost">
                <Square size={15} />
                Stop
              </ActionButton>
            </div>
          </Panel>
          <Panel title="Consent">
            <StatTile label="Status" value="Granted" detail="Verbal, 10:08" />
          </Panel>
          <Panel title="Audio Quality">
            <StatTile label="Signal" value="92%" detail="Low noise" />
            <div className="meter"><span style={{ width: "92%" }} /></div>
          </Panel>
          <Panel title="Queue">
            <StatTile label="Unresolved" value="7" detail="Review items" />
          </Panel>
        </div>

        <div className="clinical-grid grid-even">
          <Panel title="Live Transcript" subtitle="Auto-scrolling">
              <div className="note-stack">
                {transcriptTurns.map(([time, speaker, _role, text, confidence, status]) => (
                  <div className="transcript-line" key={`${time}-${text}`}>
                    <span>{time}</span>
                    <strong>{speaker}</strong>
                    <p>{text}</p>
                    <Badge tone={status === "Low Confidence" ? "amber" : status === "Corrected" ? "blue" : "green"}>
                      {confidence}
                    </Badge>
                  </div>
                ))}
              </div>
            </Panel>

          <Panel title="Structured Observations" subtitle="Verified 70%">
              <DataTable
                columns={["Observation", "Value", "Source", "Status"]}
                rows={observations}
                renderCell={(cell, index) => index === 3 ? <Badge tone="green">{cell}</Badge> : cell}
              />
            </Panel>
        </div>

        <div className="clinical-grid workspace-bottom">
          <Panel title="Deterministic Rules Summary" subtitle="2 active">
              <DataTable
                columns={["Rule", "ID", "Severity", "Blocking", "Evidence", "Status"]}
                rows={rules}
                renderCell={(cell, index) => {
                  if (index === 2) return <Badge tone={cell === "High" ? "red" : "amber"}>{cell}</Badge>;
                  if (index === 5) return <Badge tone={cell === "Active" ? "amber" : "green"}>{cell}</Badge>;
                  return cell;
                }}
              />
            </Panel>

          <Panel title="Session Note" subtitle="Clinician-authored - used for synthesis">
              <Field label="Subjective / Objective / Assessment / Plan">
                <textarea defaultValue={`S: Patient reports intermittent abdominal tightening and brief dizziness, now resolved. Denies bleeding or fluid leakage.\n\nO: BP 118/76, HR 88, Temp 36.7 C. Fundal height 28 cm. FHR 146 bpm. Urine protein 1+.\n\nA: Routine ANC follow-up at 28w4d with proteinuria follow-up needed.\n\nP: Counsel warning signs, repeat urine assessment, review Hb and vaccination status, follow up in 2 weeks.`} />
              </Field>
              <div className="button-cluster" style={{ marginTop: 10 }}>
                <ActionButton>
                  <Save size={15} />
                  Save draft
                </ActionButton>
                <ActionButton tone="secondary">
                  <WandSparkles size={15} />
                  Refresh AI
                </ActionButton>
              </div>
            </Panel>

            <Panel title="Recent Activity">
              <Timeline
                items={auditEvents.slice(0, 5).map(([time, actor, action, target, outcome, detail]) => [
                  time.slice(11),
                  `${action} · ${outcome}`,
                  `${actor} updated ${target}. ${detail}`
                ])}
              />
            </Panel>
        </div>
      </div>
    </main>
  );
}
