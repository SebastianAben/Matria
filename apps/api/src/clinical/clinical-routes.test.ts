import request from 'supertest';

import { createApp } from '../app.js';

async function createLoggedInAgent() {
  const app = await createApp({
    appEnv: 'test',
    port: 4000,
    adminBootstrapEmail: 'admin@matria.local',
    adminBootstrapPassword: 'development-password',
  });
  const agent = request.agent(app);

  await agent
    .post('/auth/login')
    .send({ email: 'admin@matria.local', password: 'development-password' })
    .expect(200);

  return agent;
}

describe('clinical domain routes', () => {
  it('runs preflight and returns deterministic red flags', async () => {
    const agent = await createLoggedInAgent();

    const patient = await agent
      .post('/clinical/patients')
      .send({ hospitalRecordNumber: 'MRN-001', displayName: 'Phase Three Patient' })
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

    await agent
      .post(`/clinical/encounters/${encounter.body.data.id}/observations`)
      .send({
        kind: 'blood_pressure',
        code: 'systolic_bp',
        value: 170,
        unit: 'mmHg',
        confidence: 0.99,
        source: 'manual',
        verifiedByClinician: true,
      })
      .expect(201);
    await agent
      .post(`/clinical/encounters/${encounter.body.data.id}/observations`)
      .send({
        kind: 'blood_pressure',
        code: 'diastolic_bp',
        value: 112,
        unit: 'mmHg',
        confidence: 0.99,
        source: 'manual',
        verifiedByClinician: true,
      })
      .expect(201);
    await agent
      .post(`/clinical/encounters/${encounter.body.data.id}/observations`)
      .send({
        kind: 'gestational_age',
        code: 'gestational_age_weeks',
        value: 22,
        unit: 'weeks',
        confidence: 0.99,
        source: 'manual',
        verifiedByClinician: true,
      })
      .expect(201);

    const response = await agent
      .post(`/clinical/encounters/${encounter.body.data.id}/preflight`)
      .expect(200);

    expect(response.body.data).toMatchObject({
      readyForSynthesis: true,
      prompts: [],
      ruleResults: [
        expect.objectContaining({
          ruleId: 'severe-hypertension',
          severity: 'critical',
          mustAcknowledge: true,
        }),
      ],
    });
  });

  it('enforces patient and pregnancy episode scoping before encounter creation', async () => {
    const agent = await createLoggedInAgent();

    const patientA = await agent
      .post('/clinical/patients')
      .send({ hospitalRecordNumber: 'MRN-A', displayName: 'Patient A' })
      .expect(201);
    const patientB = await agent
      .post('/clinical/patients')
      .send({ hospitalRecordNumber: 'MRN-B', displayName: 'Patient B' })
      .expect(201);
    const episodeA = await agent
      .post(`/clinical/patients/${patientA.body.data.id}/pregnancy-episodes`)
      .send({})
      .expect(201);

    const response = await agent
      .post('/clinical/encounters')
      .send({
        patientId: patientB.body.data.id,
        pregnancyEpisodeId: episodeA.body.data.id,
        type: 'initial_anc',
      })
      .expect(400);

    expect(response.body).toMatchObject({
      code: 'pregnancy_scope_mismatch',
    });
  });
});
