// End-to-end test of the happy path (#161, ADR-034): the real frontend (Vite) against the real
// backend and a PostGIS database with a mini-dataset; the external services are fake.
// `npm run e2e` prepares the database first (prepare-database.js) and then runs this config.
import { defineConfig, devices } from '@playwright/test';

import {
  BACKEND_DIR,
  BACKEND_PORT,
  FAKE_SERVICES_URL,
  FRONTEND_DIR,
  FRONTEND_PORT,
  backendEnvironment,
} from './environment.js';

const isCi = Boolean(process.env.CI);

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.js',
  outputDir: '../test-results/e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  reporter: isCi
    ? [['list'], ['html', { open: 'never', outputFolder: '../playwright-report' }]]
    : 'list',
  use: {
    baseURL: `http://127.0.0.1:${FRONTEND_PORT}`,
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node e2e/fake-services.js',
      cwd: FRONTEND_DIR,
      url: `${FAKE_SERVICES_URL}/health`,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: 'node src/server.js',
      cwd: BACKEND_DIR,
      env: backendEnvironment(),
      url: `http://127.0.0.1:${BACKEND_PORT}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `npx vite --host 127.0.0.1 --port ${FRONTEND_PORT} --strictPort`,
      cwd: FRONTEND_DIR,
      env: { API_PROXY_TARGET: `http://127.0.0.1:${BACKEND_PORT}` },
      url: `http://127.0.0.1:${FRONTEND_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
