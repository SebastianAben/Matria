import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'npm -w apps/api run dev',
      cwd: '../..',
      env: {
        ...process.env,
        APP_ENV: 'test',
      },
      url: 'http://127.0.0.1:4000/health',
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: 'npm -w apps/web run dev',
      cwd: '../..',
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
