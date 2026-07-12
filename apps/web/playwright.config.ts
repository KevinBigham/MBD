import { defineConfig, devices } from '@playwright/test';

const isCi = Boolean(process.env.CI);

export default defineConfig({
  testDir: './e2e',
  testMatch: ['reload-smoke.spec.ts', 'multitab-guard.spec.ts', 'storage-pressure.spec.ts', 'sim-advance-journal.spec.ts'],
  fullyParallel: false,
  forbidOnly: isCi,
  // Storage-pressure causality is never retried: a first-attempt result is the evidence.
  retries: 0,
  workers: 1,
  failOnFlakyTests: isCi,
  timeout: 8 * 60 * 1_000,
  globalTimeout: 30 * 60 * 1_000,
  expect: {
    timeout: 30_000,
  },
  outputDir: 'test-results/reload-smoke',
  reporter: [
    ['line'],
    ['html', { open: 'never' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4174/MBD/',
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
    locale: 'en-US',
    timezoneId: 'UTC',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm run preview --host 127.0.0.1 --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174/MBD/',
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
