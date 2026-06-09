import { randomUUID } from 'node:crypto';

import request from 'supertest';

import { createApp } from '../app.js';

type LoggedInAgent = Awaited<ReturnType<typeof createLoggedInAgent>>;

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

async function createEncounter(agent: LoggedInAgent) {
  const patient = await agent
    .post('/clinical/patients')
    .send({ hospitalRecordNumber: `MRN-${randomUUID()}`, displayName: 'Phase Five Patient' })
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

  return encounter.body.data.id as string;
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

async function createReferralSummaryOutput(agent: LoggedInAgent) {
  const encounterId = await createEncounter(agent);
  await addRequiredAncObservations(agent, encounterId);

  const synthesis = await agent
    .post(`/ai/encounters/${encounterId}/synthesis`)
    .send({ kinds: ['referral_summary'] })
    .expect(201);

  return synthesis.body.data[0] as { id: string };
}

describe('FHIR export routes', () => {
  it('blocks FHIR export for draft and rejected outputs', async () => {
    const agent = await createLoggedInAgent();
    const output = await createReferralSummaryOutput(agent);

    await agent.post(`/fhir/outputs/${output.id}/export`).send({}).expect(409);
    await agent.post(`/ai/outputs/${output.id}/reject`).send({}).expect(200);

    const rejectedExport = await agent
      .post(`/fhir/outputs/${output.id}/export`)
      .send({})
      .expect(409);
    expect(rejectedExport.body).toMatchObject({ code: 'output_not_approved' });
  });

  it('exports approved outputs as FHIR R4 document bundles with provenance', async () => {
    const agent = await createLoggedInAgent();
    const output = await createReferralSummaryOutput(agent);

    await agent
      .post(`/ai/outputs/${output.id}/approve`)
      .send({ editedContent: 'Approved referral summary for specialist review.' })
      .expect(200);

    const response = await agent.post(`/fhir/outputs/${output.id}/export`).send({}).expect(201);

    expect(response.body.data).toMatchObject({
      outputId: output.id,
      status: 'generated',
      approvingClinicianUserId: '343f9737-e017-469d-af7e-78cdd15a459f',
      artifactJson: {
        resourceType: 'Bundle',
        type: 'document',
      },
    });
    expect(response.body.data.artifactJson.entry).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resource: expect.objectContaining({ resourceType: 'Composition', status: 'final' }),
        }),
        expect.objectContaining({
          resource: expect.objectContaining({ resourceType: 'Provenance' }),
        }),
      ]),
    );
  });
});
