import { defineConfig } from '@playwright/test';

// A first-time visitor is greeted by the delivery-location sheet. Specs that are not about it start as a visitor who chose "Browse first".
const skippedPrompt = { name: 'almina.delivery-skip.v1', value: String(Date.now()) };
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1, // Shared disposable DB; each commerce/admin test resets its own fixture.
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: [['list'], ['html', { outputFolder: '.verification-results/playwright-report', open: 'never' }],
    ['junit', { outputFile: '.verification-results/e2e.xml' }]],
  outputDir: '.verification-results/e2e',
  use: { browserName: 'chromium', viewport: { width: 1280, height: 900 },
    baseURL: 'http://127.0.0.1:4710', actionTimeout: 10000, navigationTimeout: 15000,
    trace: 'retain-on-failure', screenshot: 'only-on-failure', serviceWorkers: 'block',
    storageState: { cookies: [], origins: [4710, 4730, 4740, 4750].map(port => ({ origin: `http://127.0.0.1:${port}`, localStorage: [skippedPrompt] })) } },
  webServer: { command: 'node scripts/tooling/e2e-servers.mjs', url: 'http://127.0.0.1:4709',
    reuseExistingServer: false, timeout: 180000, gracefulShutdown: { signal: 'SIGTERM', timeout: 15000 } },
});
