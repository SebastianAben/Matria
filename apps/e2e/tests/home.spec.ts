import { expect, test } from '@playwright/test';

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
