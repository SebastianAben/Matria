import { randomUUID } from 'node:crypto';

import type { SynthesisProvider } from './ai-provider.js';
import request from 'supertest';

import { createApp } from '../app.js';

type LoggedInAgent = Awaited<ReturnType<typeof createLoggedInAgent>>;

async function createLoggedInAgent(dependencies: Parameters<typeof createApp>[1] = {}) {
  const app = await createApp(
    {
      appEnv: 'test',
      port: 4000,
      adminBootstrapEmail: 'admin@matria.local',
      adminBootstrapPassword: 'development-password',
    },
    dependencies,
  );
  const agent = request.agent(app);

  await agent
    .post('/auth/login')
    .send({ email: 'admin@matria.local', password: 'development-password' })
    .expect(200);

  return agent;
}

async function createEncounter(agent: LoggedInAgent) {
  const patient = await agent
    .post('/clinical/patients')
    .send({ hospitalRecordNumber: `MRN-${randomUUID()}`, displayName: 'Phase Four Patient' })
    .expect(201);
  const episode = await agent
    .post(`/clinical/patients/${patient.body.data.id}/pregnancy-episodes`)
    .send({ estimatedDueDate: '2026-10-20' })
    .expect(201);
  const encounter = await agent
    .post('/clinical/encounters')
    .send({
      patientId: patient.body.data.id,
      pregnancyEpisodeId: episode.body.data.id,
      type: 'urgent_review',
    })
    .expect(201);

  return {
    patientId: patient.body.data.id as string,
    pregnancyEpisodeId: episode.body.data.id as string,
    encounterId: encounter.body.data.id as string,
  };
}

async function addRequiredAncObservations(agent: LoggedInAgent, encounterId: string) {
  for (const observation of [
    { kind: 'blood_pressure', code: 'systolic_bp', value: 170, unit: 'mmHg' },
    { kind: 'blood_pressure', code: 'diastolic_bp', value: 112, unit: 'mmHg' },
    { kind: 'gestational_age', code: 'gestational_age_weeks', value: 22, unit: 'weeks' },
  ]) {
    await agent
      .post(`/clinical/encounters/${encounterId}/observations`)
      .send({
        ...observation,
        confidence: 0.99,
        source: 'manual',
        verifiedByClinician: true,
      })
      .expect(201);
  }
}

describe('AI orchestration and review lifecycle', () => {
  it('blocks AI synthesis before required preflight fields are complete', async () => {
    const agent = await createLoggedInAgent();
    const { encounterId } = await createEncounter(agent);

    const response = await agent
      .post(`/ai/encounters/${encounterId}/synthesis`)
      .send({})
      .expect(409);

    expect(response.body).toMatchObject({
      code: 'preflight_incomplete',
    });
  });

  it('keeps deterministic preflight visible when the provider fails', async () => {
    const failingProvider: SynthesisProvider = {
      name: 'gemini',
      async synthesize() {
        throw new Error('provider unavailable');
      },
    };
    const agent = await createLoggedInAgent({ synthesisProvider: failingProvider });
    const { encounterId } = await createEncounter(agent);
    await addRequiredAncObservations(agent, encounterId);

    await agent.post(`/ai/encounters/${encounterId}/synthesis`).send({}).expect(502);
    const outputs = await agent.get(`/ai/encounters/${encounterId}/outputs`).expect(200);
    const preflight = await agent.post(`/clinical/encounters/${encounterId}/preflight`).expect(200);

    expect(outputs.body.data).toEqual([]);
    expect(preflight.body.data.ruleResults).toEqual([
      expect.objectContaining({ ruleId: 'severe-hypertension', severity: 'critical' }),
    ]);
  });

  it('creates draft outputs and writes patient memory only after approval', async () => {
    const agent = await createLoggedInAgent();
    const { patientId, pregnancyEpisodeId, encounterId } = await createEncounter(agent);
    await addRequiredAncObservations(agent, encounterId);

    const synthesis = await agent
      .post(`/ai/encounters/${encounterId}/synthesis`)
      .send({ kinds: ['risk_synthesis'] })
      .expect(201);
    const [output] = synthesis.body.data;
    const memoryBeforeApproval = await agent
      .get(`/ai/patients/${patientId}/pregnancy-episodes/${pregnancyEpisodeId}/memory`)
      .expect(200);

    expect(output).toMatchObject({
      kind: 'risk_synthesis',
      status: 'draft',
      preservesRuleResultIds: [expect.any(String)],
    });
    expect(memoryBeforeApproval.body.data).toEqual([]);

    await agent
      .post(`/ai/outputs/${output.id}/approve`)
      .send({ editedContent: 'Clinician-approved risk synthesis.' })
      .expect(200);
    const memoryAfterApproval = await agent
      .get(`/ai/patients/${patientId}/pregnancy-episodes/${pregnancyEpisodeId}/memory`)
      .expect(200);

    expect(memoryAfterApproval.body.data).toEqual([
      expect.objectContaining({
        patientId,
        pregnancyEpisodeId,
        sourceOutputId: output.id,
        content: 'Clinician-approved risk synthesis.',
      }),
    ]);
  });
});
