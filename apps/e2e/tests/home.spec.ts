import { expect, test } from '@playwright/test';

test('clinical workspace shell is reachable', async ({ page, request }) => {
  const health = await request.get('http://127.0.0.1:4000/health');
  expect(health.ok()).toBe(true);

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Antenatal encounter review' })).toBeVisible();
  await expect(page.getByText('Decision support only')).toBeVisible();
  await expect(page.getByText('Rules-first preflight')).toBeVisible();
});
