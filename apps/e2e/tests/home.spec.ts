import { expect, test, type APIRequestContext } from '@playwright/test';

async function login(request: APIRequestContext) {
  const response = await request.post('http://127.0.0.1:4000/auth/login', {
    data: {
      email: 'admin@matria.local',
      password: 'development-password',
    },
  });
  expect(response.ok()).toBe(true);
}

async function createEncounter(request: APIRequestContext, options: { complete: boolean }) {
  await login(request);
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const patient = await request.post('http://127.0.0.1:4000/clinical/patients', {
    data: {
      hospitalRecordNumber: `E2E-${suffix}`,
      displayName: `Phase 8 Patient ${suffix}`,
    },
  });
  expect(patient.ok()).toBe(true);
  const patientBody = await patient.json();
  const patientId = patientBody.data.id as string;

  const episode = await request.post(
    `http://127.0.0.1:4000/clinical/patients/${patientId}/pregnancy-episodes`,
    {
      data: { estimatedDueDate: '2026-10-20' },
    },
  );
  expect(episode.ok()).toBe(true);
  const episodeBody = await episode.json();
  const pregnancyEpisodeId = episodeBody.data.id as string;

  const encounter = await request.post('http://127.0.0.1:4000/clinical/encounters', {
    data: {
      patientId,
      pregnancyEpisodeId,
      type: 'urgent_review',
    },
  });
  expect(encounter.ok()).toBe(true);
  const encounterBody = await encounter.json();
  const encounterId = encounterBody.data.id as string;

  const observations = options.complete
    ? [
        { kind: 'blood_pressure', code: 'systolic_bp', value: 170, unit: 'mmHg' },
        { kind: 'blood_pressure', code: 'diastolic_bp', value: 112, unit: 'mmHg' },
        { kind: 'gestational_age', code: 'gestational_age_weeks', value: 22, unit: 'weeks' },
      ]
    : [{ kind: 'blood_pressure', code: 'systolic_bp', value: 170, unit: 'mmHg' }];

  for (const observation of observations) {
    const created = await request.post(
      `http://127.0.0.1:4000/clinical/encounters/${encounterId}/observations`,
      {
        data: {
          ...observation,
          confidence: 0.99,
          source: 'manual',
          verifiedByClinician: true,
        },
      },
    );
    expect(created.ok()).toBe(true);
  }

  return { encounterId, patientId, pregnancyEpisodeId };
}

test('clinician can run core ANC workspace flow', async ({ page, request }) => {
  const health = await request.get('http://127.0.0.1:4000/health');
  expect(health.ok()).toBe(true);

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Antenatal encounter review' })).toBeVisible();
  await expect(page.getByText('Decision support only')).toBeVisible();

  await page.getByRole('button', { name: 'Start encounter' }).click();
  await expect(page.getByText('Ayu Lestari')).toBeVisible();

  await page.getByRole('button', { name: 'Run preflight' }).click();
  await expect(page.getByText('Ready for synthesis')).toBeVisible();
  await expect(page.getByText('Deterministic safety first')).toBeVisible();

  await page.getByRole('button', { name: 'Generate drafts' }).click();
  await expect(page.getByRole('tab', { name: 'ANC note' })).toBeVisible();

  await page.getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByText('Status: approved')).toBeVisible();

  await page.getByRole('button', { name: 'FHIR export' }).click();
  await expect(page.getByText(/^FHIR generated:/)).toBeVisible();
});

test('admin can manage RBAC users and inspect audit logs', async ({ page }) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `phase8-auditor-${suffix}@matria.local`;
  const displayName = `Phase 8 Auditor ${suffix}`;

  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Admin console' })).toBeVisible();

  await page.getByRole('button', { name: 'Login as bootstrap admin' }).click();
  await expect(page.getByRole('heading', { name: 'Bootstrap Administrator' })).toBeVisible();

  await page.getByLabel('New user email').fill(email);
  await page.getByLabel('New user display name').fill(displayName);
  await page.getByLabel('Initial password').fill('development-password');
  await page.getByRole('button', { name: 'Create user' }).click();
  await expect(page.getByText(email, { exact: true })).toBeVisible();

  await page.getByLabel('Role assignment user').selectOption({ label: displayName });
  await page.getByLabel('Role to assign').selectOption('auditor');
  await page.getByRole('button', { name: 'Assign role' }).click();
  await expect(page.getByText('Current permissions: audit:read')).toBeVisible();

  await page.getByRole('tab', { name: 'Audit' }).click();
  await expect(page.getByText('admin.user.create')).toBeVisible();
  await expect(page.getByText('admin.user.roles.assign')).toBeVisible();
});

test('unauthorized users cannot access protected API surfaces', async ({ request }) => {
  const clinical = await request.post('http://127.0.0.1:4000/clinical/patients', {
    data: {},
  });
  const ai = await request.post('http://127.0.0.1:4000/ai/encounters/not-real/synthesis', {
    data: {},
  });
  const fhir = await request.post('http://127.0.0.1:4000/fhir/outputs/not-real/export', {
    data: {},
  });
  const admin = await request.get('http://127.0.0.1:4000/admin/users');

  expect(clinical.status()).toBe(401);
  expect(ai.status()).toBe(401);
  expect(fhir.status()).toBe(401);
  expect(admin.status()).toBe(401);
});

test('missing ANC fields produce prompts and block synthesis', async ({ request }) => {
  const { encounterId } = await createEncounter(request, { complete: false });

  const preflight = await request.post(
    `http://127.0.0.1:4000/clinical/encounters/${encounterId}/preflight`,
  );
  expect(preflight.ok()).toBe(true);
  const preflightBody = await preflight.json();

  const synthesis = await request.post(
    `http://127.0.0.1:4000/ai/encounters/${encounterId}/synthesis`,
    {
      data: {},
    },
  );
  const synthesisBody = await synthesis.json();

  expect(preflightBody.data.readyForSynthesis).toBe(false);
  expect(preflightBody.data.prompts).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ field: 'diastolic_bp', severity: 'required' }),
      expect.objectContaining({ field: 'gestational_age_weeks', severity: 'required' }),
    ]),
  );
  expect(synthesis.status()).toBe(409);
  expect(synthesisBody.code).toBe('preflight_incomplete');
});

test('AI failure keeps deterministic preflight visible and creates no output', async ({
  request,
}) => {
  const { encounterId, patientId, pregnancyEpisodeId } = await createEncounter(request, {
    complete: true,
  });

  const failedSynthesis = await request.post(
    `http://127.0.0.1:4000/ai/encounters/${encounterId}/synthesis`,
    {
      data: {},
      headers: {
        'x-matria-test-provider-failure': 'true',
      },
    },
  );
  const preflight = await request.post(
    `http://127.0.0.1:4000/clinical/encounters/${encounterId}/preflight`,
  );
  const outputs = await request.get(`http://127.0.0.1:4000/ai/encounters/${encounterId}/outputs`);
  const memory = await request.get(
    `http://127.0.0.1:4000/ai/patients/${patientId}/pregnancy-episodes/${pregnancyEpisodeId}/memory`,
  );
  const preflightBody = await preflight.json();
  const outputsBody = await outputs.json();
  const memoryBody = await memory.json();

  expect(failedSynthesis.status()).toBe(502);
  expect(preflightBody.data.ruleResults).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ ruleId: 'severe-hypertension', severity: 'critical' }),
    ]),
  );
  expect(outputsBody.data).toEqual([]);
  expect(memoryBody.data).toEqual([]);
});
