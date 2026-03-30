import { defineConfig } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.pw.ts',
  timeout: 30_000,
  expect: {
    timeout: 7_500
  },
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  use: {
    baseURL,
    headless: true,
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: {
    command: 'npx vite --host 127.0.0.1 --port 4173 --strictPort',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000
  }
});
