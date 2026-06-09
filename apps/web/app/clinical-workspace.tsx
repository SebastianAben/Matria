'use client';

import type {
  ClinicalPreflight,
  Encounter,
  FhirExport,
  GeneratedOutput,
  Patient,
  PregnancyEpisode,
  SessionUser,
  StructuredObservation,
} from '@matria/contracts';
import { useMemo, useState } from 'react';

import { captureSurfaces, demoEpisode, demoObservations, demoPatient } from '../lib/clinical-demo';
import { matriaApi } from '../lib/api-client';

type StepStatus = 'idle' | 'working' | 'done' | 'blocked';

type WorkspaceState = {
  user?: SessionUser;
  patient?: Patient;
  episode?: PregnancyEpisode;
  encounter?: Encounter;
  observations: StructuredObservation[];
  preflight?: ClinicalPreflight;
  outputs: GeneratedOutput[];
  selectedOutputId?: string;
  fhirExport?: FhirExport;
};

const initialState: WorkspaceState = {
  observations: [],
  outputs: [],
};

const outputLabels: Record<GeneratedOutput['kind'], string> = {
  anc_note: 'ANC note',
  risk_synthesis: 'Risk synthesis',
  missing_questions: 'Missing questions',
  referral_summary: 'Referral summary',
};

export function ClinicalWorkspace() {
  const [state, setState] = useState<WorkspaceState>(initialState);
  const [stepStatus, setStepStatus] = useState<Record<string, StepStatus>>({});
  const [message, setMessage] = useState('Ready to start authenticated ANC workflow.');
  const [reviewText, setReviewText] = useState('');

  const selectedOutput = useMemo(
    () => state.outputs.find((output) => output.id === state.selectedOutputId) ?? state.outputs[0],
    [state.outputs, state.selectedOutputId],
  );
  const canOpenAdmin =
    state.user?.permissions.includes('user:admin') ||
    state.user?.permissions.includes('audit:read');

  async function runStep<T>(key: string, action: () => Promise<T>, doneMessage: string) {
    setStepStatus((current) => ({ ...current, [key]: 'working' }));

    try {
      const result = await action();
      setStepStatus((current) => ({ ...current, [key]: 'done' }));
      setMessage(doneMessage);
      return result;
    } catch (error) {
      setStepStatus((current) => ({ ...current, [key]: 'blocked' }));
      setMessage(error instanceof Error ? error.message : 'Workflow step failed.');
      throw error;
    }
  }

  async function startEncounter() {
    await runStep(
      'capture',
      async () => {
        const session = await matriaApi.login();
        if (!session.user) {
          throw new Error('Authenticated session was not created.');
        }
        const user = session.user;

        const patient = (await matriaApi.createPatient(demoPatient)).data;
        const episode = (await matriaApi.createPregnancyEpisode(patient.id, demoEpisode)).data;
        const encounter = (
          await matriaApi.createEncounter({
            patientId: patient.id,
            pregnancyEpisodeId: episode.id,
            type: 'initial_anc',
          })
        ).data;
        const observations = await Promise.all(
          demoObservations.map((observation) =>
            matriaApi.addObservation(encounter.id, observation).then((response) => response.data),
          ),
        );

        setState((current) => ({
          ...current,
          user,
          patient,
          episode,
          encounter,
          observations,
        }));
      },
      'Encounter capture completed against authenticated API.',
    );
  }

  async function runPreflight() {
    const encounter = state.encounter;
    if (!encounter) {
      setMessage('Create an encounter before preflight.');
      return;
    }

    await runStep(
      'preflight',
      async () => {
        const preflight = (await matriaApi.runPreflight(encounter.id)).data;
        setState((current) => ({ ...current, preflight }));
      },
      'Deterministic preflight completed.',
    );
  }

  async function requestSynthesis() {
    const encounter = state.encounter;
    if (!encounter || !state.preflight?.readyForSynthesis) {
      setMessage('Resolve required preflight prompts before synthesis.');
      return;
    }

    await runStep(
      'synthesis',
      async () => {
        const outputs = (await matriaApi.requestSynthesis(encounter.id)).data;
        const firstOutput = outputs[0];
        if (!firstOutput) {
          throw new Error('AI synthesis returned no drafts.');
        }
        setState((current) => ({
          ...current,
          outputs,
          selectedOutputId: firstOutput.id,
        }));
        setReviewText(firstOutput.content);
      },
      'AI drafts created after rules-first preflight.',
    );
  }

  async function saveEdit() {
    if (!selectedOutput) return;

    await runStep(
      'review',
      async () => {
        const output = (await matriaApi.editOutput(selectedOutput.id, reviewText)).data;
        setState((current) => ({
          ...current,
          outputs: current.outputs.map((item) => (item.id === output.id ? output : item)),
        }));
      },
      'Clinician edit saved.',
    );
  }

  async function approveSelected() {
    if (!selectedOutput) return;

    await runStep(
      'approve',
      async () => {
        const output = (await matriaApi.approveOutput(selectedOutput.id, reviewText)).data;
        setState((current) => ({
          ...current,
          outputs: current.outputs.map((item) => (item.id === output.id ? output : item)),
        }));
      },
      'Output approved and memory write gate completed.',
    );
  }

  async function rejectSelected() {
    if (!selectedOutput) return;

    await runStep(
      'approve',
      async () => {
        const output = (await matriaApi.rejectOutput(selectedOutput.id)).data;
        setState((current) => ({
          ...current,
          outputs: current.outputs.map((item) => (item.id === output.id ? output : item)),
        }));
      },
      'Output rejected.',
    );
  }

  async function exportFhir() {
    if (!selectedOutput || selectedOutput.status !== 'approved') {
      setMessage('FHIR export requires an approved output.');
      return;
    }

    await runStep(
      'export',
      async () => {
        const fhirExport = (await matriaApi.exportFhir(selectedOutput.id)).data;
        setState((current) => ({ ...current, fhirExport }));
      },
      'FHIR artifact generated with approval provenance.',
    );
  }

  function selectOutput(output: GeneratedOutput) {
    setState((current) => ({ ...current, selectedOutputId: output.id }));
    setReviewText(output.content);
  }

  return (
    <main className="workspace">
      <section className="statusBar" aria-label="System status">
        <div>
          <p className="eyebrow">Matria clinical workspace</p>
          <h1>Antenatal encounter review</h1>
        </div>
        <div className="statusActions">
          {canOpenAdmin ? <a href="/admin">Admin</a> : null}
          <span className="statusPill">Decision support only</span>
        </div>
      </section>

      <section className="commandBar" aria-label="Workflow actions">
        <button onClick={startEncounter} type="button">
          Start encounter
        </button>
        <button disabled={!state.encounter} onClick={runPreflight} type="button">
          Run preflight
        </button>
        <button
          disabled={!state.preflight?.readyForSynthesis}
          onClick={requestSynthesis}
          type="button"
        >
          Generate drafts
        </button>
        <button disabled={!selectedOutput} onClick={saveEdit} type="button">
          Save edit
        </button>
        <button disabled={!selectedOutput} onClick={approveSelected} type="button">
          Approve
        </button>
        <button disabled={!selectedOutput} onClick={rejectSelected} type="button">
          Reject
        </button>
        <button disabled={selectedOutput?.status !== 'approved'} onClick={exportFhir} type="button">
          FHIR export
        </button>
      </section>

      <p className="message" role="status">
        {message}
      </p>

      <section className="workspaceGrid" aria-label="Clinical workflow">
        <div className="panel">
          <p className="sectionLabel">Authenticated routing</p>
          <h2>Session and encounter</h2>
          <dl className="detailList">
            <div>
              <dt>User</dt>
              <dd>{state.user?.displayName ?? 'Not authenticated'}</dd>
            </div>
            <div>
              <dt>Patient</dt>
              <dd>{state.patient?.displayName ?? 'Pending'}</dd>
            </div>
            <div>
              <dt>Encounter</dt>
              <dd>{state.encounter?.type.replaceAll('_', ' ') ?? 'Pending'}</dd>
            </div>
          </dl>
        </div>

        <div className="panel">
          <p className="sectionLabel">Encounter capture</p>
          <h2>Clinical inputs</h2>
          <div className="captureGrid">
            {captureSurfaces.map(([label, description]) => (
              <div className="captureItem" key={label}>
                <strong>{label}</strong>
                <span>{description}</span>
              </div>
            ))}
          </div>
          <div className="observationList">
            {state.observations.map((observation) => (
              <span key={observation.id}>
                {observation.code ?? observation.kind}: {String(observation.value)}{' '}
                {observation.unit ?? ''}
              </span>
            ))}
          </div>
        </div>

        <div className="panel rulesPanel">
          <p className="sectionLabel">Preflight results</p>
          <h2>Deterministic safety first</h2>
          <div className="readiness">
            {state.preflight
              ? state.preflight.readyForSynthesis
                ? 'Ready for synthesis'
                : 'Required prompts pending'
              : 'Not run'}
          </div>
          <div className="resultStack">
            {(state.preflight?.ruleResults ?? []).map((rule) => (
              <article className="ruleHit" key={rule.id}>
                <strong>{rule.severity}</strong>
                <p>{rule.message}</p>
                <small>{rule.evidence.join(' | ')}</small>
              </article>
            ))}
            {(state.preflight?.prompts ?? []).map((prompt) => (
              <article className="promptHit" key={prompt.field}>
                <strong>{prompt.severity}</strong>
                <p>{prompt.message}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="panel reviewPanel">
          <p className="sectionLabel">Clinician review</p>
          <h2>AI-generated drafts</h2>
          <div className="tabRow" role="tablist" aria-label="Generated output kinds">
            {state.outputs.map((output) => (
              <button
                aria-selected={selectedOutput?.id === output.id}
                key={output.id}
                onClick={() => selectOutput(output)}
                role="tab"
                type="button"
              >
                {outputLabels[output.kind]}
              </button>
            ))}
          </div>
          <textarea
            aria-label="Clinician editable generated output"
            onChange={(event) => setReviewText(event.target.value)}
            placeholder="Generated clinical draft appears here after synthesis."
            value={reviewText}
          />
          <div className="reviewMeta">
            <span>Status: {selectedOutput?.status ?? 'none'}</span>
            <span>Rule IDs preserved: {selectedOutput?.preservesRuleResultIds.length ?? 0}</span>
          </div>
        </div>

        <div className="panel">
          <p className="sectionLabel">Approval and export</p>
          <h2>Gated downstream actions</h2>
          <ol className="timeline">
            {['capture', 'preflight', 'synthesis', 'review', 'approve', 'export'].map((step) => (
              <li data-status={stepStatus[step] ?? 'idle'} key={step}>
                <span>{step}</span>
                <strong>{stepStatus[step] ?? 'idle'}</strong>
              </li>
            ))}
          </ol>
          <p className="artifact">
            {state.fhirExport
              ? `FHIR ${state.fhirExport.status}: ${state.fhirExport.id}`
              : 'No FHIR artifact generated.'}
          </p>
        </div>
      </section>
    </main>
  );
}
