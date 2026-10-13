import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  timeout: 180000,
  testDir: './e2e', fullyParallel: false, workers: 1,
  use: { baseURL: 'http://localhost:8787', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) } }],
  webServer: { command: `npx wrangler dev --local --port 8787${process.env.E2E_PERSIST_DIR ? ` --persist-to ${process.env.E2E_PERSIST_DIR}` : ''}`, url: 'http://localhost:8787', reuseExistingServer: false, timeout: 120000 },
});