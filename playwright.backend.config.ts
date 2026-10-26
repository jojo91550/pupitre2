import { defineConfig, devices } from '@playwright/test';

// End-to-end tests against the real backend (docs/specs/108-backend-operations-and-testing.md):
// both apps on port 3000, pupitre-api on port 8080, PostgreSQL and Keycloak
// from apps/api/compose.yaml (`pnpm api:up`). Sign-in goes through the real
// Keycloak page of the test realm. The database outlives a run, so every test
// is written to pass again on the data a previous run left.
//
//   pnpm api:up && pnpm test:e2e:backend

export default defineConfig({
  testDir: './e2e/backend',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never', outputFolder: 'playwright-report-backend' }]] : 'list',
  use: {
    // Port 3000: the Keycloak client of the test realm redirects there.
    baseURL: 'http://localhost:3000',
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /setup\.ts$/ },
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, dependencies: ['setup'] },
  ],
  webServer: [
    {
      command: 'node scripts/api.mjs dev',
      url: 'http://localhost:8080/health',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      command: 'pnpm dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
