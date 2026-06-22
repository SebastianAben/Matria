"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import {
  baselineHighlights,
  baselineNote,
  baselineObservations,
  baselineRecommendations,
  baselineRules,
  baselineSummary,
  baselineTranscript,
  demoEncounter06,
  demoEndSeconds,
  demoPatient06,
  demoPregnancy06,
  demoTimeline,
  type DemoHighlight,
  type DemoRecommendation,
  type DemoRule
} from "../../../lib/demo-06-lus";
import {
  ActionButton,
  Badge,
  DataTable,
  KeyValueList,
  PageHeader,
  Panel,
  PatientContextBar,
  StatTile,
} from "../../components/clinical-ui";

function toneForSeverity(severity: string): "green" | "amber" | "red" {
  if (severity.toLowerCase().includes("high") || severity.toLowerCase().includes("critical")) return "red";
  if (severity.toLowerCase().includes("medium") || severity.toLowerCase().includes("watch")) return "amber";
  return "green";
}

function upsertById<T extends { id: string }>(items: T[], item: T) {
  const existing = items.findIndex((candidate) => candidate.id === item.id);
  if (existing === -1) return [...items, item];
  return items.map((candidate, index) => (index === existing ? item : candidate));
}

export default function Demo06LusPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running) return undefined;
    const interval = window.setInterval(() => {
      const startedAt = startedAtRef.current ?? Date.now();
      const nextElapsed = Math.min((Date.now() - startedAt) / 1000, demoEndSeconds);
      setElapsed(nextElapsed);
      if (nextElapsed >= demoEndSeconds) {
        window.clearInterval(interval);
        setRunning(false);
        setCompleted(true);
        videoRef.current?.pause();
      }
    }, 200);
    return () => window.clearInterval(interval);
  }, [running]);

  const visibleEvents = useMemo(
    () => demoTimeline.filter((event) => event.at <= elapsed || completed),
    [completed, elapsed]
  );

  const transcriptTurns = useMemo(
    () => [
      ...baselineTranscript,
      ...visibleEvents.flatMap((event) => (event.kind === "transcript" ? [event.turn] : []))
    ],
    [visibleEvents]
  );

  const observations = useMemo(
    () => [
      ...baselineObservations,
      ...visibleEvents.flatMap((event) => (event.kind === "observation" ? [event.observation] : []))
    ],
    [visibleEvents]
  );

  const rules = useMemo(() => {
    return visibleEvents.reduce<DemoRule[]>((current, event) => {
      if (event.kind !== "rule") return current;
      const index = current.findIndex((rule) => rule.rule === event.rule.rule);
      if (index === -1) return [...current, event.rule];
      return current.map((rule, itemIndex) => (itemIndex === index ? event.rule : rule));
    }, baselineRules);
  }, [visibleEvents]);

  const highlights = useMemo(() => {
    return visibleEvents.reduce<DemoHighlight[]>((current, event) => {
      if (event.kind !== "highlight") return current;
      return upsertById(current, event.highlight);
    }, baselineHighlights);
  }, [visibleEvents]);

  const recommendations = useMemo(() => {
    return visibleEvents.reduce<DemoRecommendation[]>((current, event) => {
      if (event.kind !== "recommendation") return current;
      return upsertById(current, event.recommendation);
    }, baselineRecommendations);
  }, [visibleEvents]);

  const summary = useMemo(() => {
    const latest = [...visibleEvents].reverse().find((event) => event.kind === "summary");
    return latest?.kind === "summary" ? latest.summary : baselineSummary;
  }, [visibleEvents]);

  const note = useMemo(() => {
    const latest = [...visibleEvents].reverse().find((event) => event.kind === "note");
    return latest?.kind === "note" ? latest.note : baselineNote;
  }, [visibleEvents]);

  const openRecommendations = recommendations.filter((recommendation) => recommendation.status !== "Done").length;
  const statusLabel = running ? "Running" : completed ? "Paused mid-consult" : "Ready";

  async function startDemo() {
    const video = videoRef.current;
    setCompleted(false);
    setElapsed(0);
    startedAtRef.current = Date.now();
    setRunning(true);
    if (video) {
      video.currentTime = 540;
      video.playbackRate = 2;
      try {
        await video.play();
      } catch {
        // Keep the clinical progression usable in constrained browsers.
      }
    }
  }

  return (
    <main className="screen demo-screen">
      <PageHeader
        eyebrow="Clinical workspace"
        title="06-LUS Mid-Consultation"
        description="Active ANC consultation workspace with existing clinical context and live ambient support."
        actions={
          running ? (
            <Badge tone="blue">Session running</Badge>
          ) : (
            <ActionButton onClick={startDemo}>
              {completed ? <RotateCcw size={15} /> : <Play size={15} />}
              {completed ? "Restart demo" : "Start demo"}
            </ActionButton>
          )
        }
      />

      <div className="clinical-grid">
        <PatientContextBar
          patient={demoPatient06}
          pregnancyEpisode={demoPregnancy06}
          encounter={demoEncounter06}
          unresolvedCount={openRecommendations}
        />

        <div className="demo-hero-grid">
          <Panel
            title="Consultation Video"
            subtitle="Current consultation media"
            actions={<Badge tone={running ? "green" : completed ? "blue" : "amber"}>{statusLabel}</Badge>}
          >
            <div className="demo-video-frame">
              <video ref={videoRef} src="/api/demo-video/06-lus" controls preload="metadata" playsInline />
            </div>
          </Panel>

          <Panel title="Patient Context" subtitle="Current mid-consultation context.">
            <div className="stat-row">
              <StatTile label="GA" value="20w0d" detail="SG_eco 20, Dies_eco 0" />
              <StatTile label="Age" value="39" detail="CSV patient 06" />
              <StatTile label="BMI" value="24.4" detail="69 kg / 168 cm" />
              <StatTile label="Parity" value="0" detail="No prior cesarean" />
            </div>
            <KeyValueList
              items={[
                ["Contractions", "0 / none reported"],
                ["Urine", <Badge key="urine" tone="amber">Missing</Badge>],
                ["Consent", "Audio, transcript, and AI granted"],
                ["Encounter state", "Active ambient session"]
              ]}
            />
          </Panel>
        </div>

        <div className="ambient-strip">
          <Panel title="Ambient Capture" subtitle="Live consultation capture">
            <div className="button-cluster">
              <Badge tone={running ? "green" : "gray"}>{running ? "Listening" : "Paused"}</Badge>
            </div>
          </Panel>
          <Panel title="Consent">
            <StatTile label="Status" value="Granted" detail="Audio / transcript / AI" />
          </Panel>
          <Panel title="Open Queue">
            <StatTile label="Items" value={String(openRecommendations)} detail="Recommendation follow-up" />
          </Panel>
          <Panel title="Encounter">
            <StatTile label="Status" value="Active" detail="Mid-consultation" />
          </Panel>
        </div>

        <div className="clinical-grid grid-even">
          <Panel title="Live Transcript" subtitle="Earlier turns are already visible; new turns appear as the consultation continues.">
            <div className="note-stack">
              {transcriptTurns.map((turn, index) => (
                <div className="transcript-line" key={`${turn.at}-${index}`}>
                  <span>{turn.at}</span>
                  <strong>{turn.speaker}</strong>
                  <p>{turn.text}</p>
                  <Badge tone={turn.status === "Live" ? "green" : "gray"}>{turn.confidence}</Badge>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Structured Observations" subtitle="Current context plus observations inferred during the consultation.">
            <DataTable
              columns={["Type", "Value", "Source", "Status"]}
              rows={observations.map((item) => [
                item.type,
                item.value,
                item.source,
                <Badge key={`${item.type}-${item.value}`} tone={item.status === "verified" ? "green" : "amber"}>{item.status}</Badge>
              ])}
            />
          </Panel>
        </div>

        <div className="clinical-grid demo-review-grid">
          <Panel title="Highlights" subtitle="AI advisory cards evolve as the dialogue progresses.">
            <div className="highlight-grid">
              {highlights.map((item) => (
                <div className={`highlight-card ${item.tone === "red" ? "risk" : item.tone === "amber" ? "warn" : "info"}`} key={item.id}>
                  <span>{item.type}</span>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                  <div className="button-cluster">
                    <Badge tone={item.tone}>{item.severity}</Badge>
                    <small>{item.confidence}</small>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Recommendations" subtitle="Recommendations update only after supporting dialogue appears.">
            <DataTable
              columns={["Recommendation", "Rationale", "Priority", "Status", "Result"]}
              rows={recommendations.map((item) => [
                item.title,
                item.rationale,
                <Badge key={`${item.id}-priority`} tone={item.tone}>{item.priority}</Badge>,
                item.status,
                item.result
              ])}
            />
          </Panel>

          <Panel title="Deterministic Rules" subtitle="Rules stay separate from AI narrative.">
            <DataTable
              columns={["Rule", "Severity", "Blocking", "Evidence", "Status"]}
              rows={rules.map((item) => [
                item.rule,
                <Badge key={`${item.rule}-severity`} tone={toneForSeverity(item.severity)}>{item.severity}</Badge>,
                item.blocking,
                item.evidence,
                <Badge key={`${item.rule}-status`} tone={item.status === "active" ? "amber" : "green"}>{item.status}</Badge>
              ])}
            />
          </Panel>
        </div>

        <div className="clinical-grid demo-bottom-grid">
          <Panel title="Progressive Summary" subtitle={completed ? "Paused with active follow-up still open" : running ? "Updating from live context" : "Baseline draft already present"}>
            <div className="note-box">
              <h3>{running || completed ? "Live ANC working draft" : "Baseline summary draft"}</h3>
              <p>{summary}</p>
            </div>
            <div className="summary-metrics">
              <span><strong>{transcriptTurns.length}</strong> Transcript turns</span>
              <span><strong>{highlights.length}</strong> Highlights</span>
              <span><strong>{openRecommendations}</strong> Open items</span>
            </div>
          </Panel>

          <Panel title="Session Note" subtitle="Working clinical note.">
            <div className="note-box">
              <pre className="demo-note-text">{note}</pre>
            </div>
          </Panel>
        </div>
      </div>
    </main>
  );
}
