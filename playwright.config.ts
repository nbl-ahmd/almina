import { defineConfig } from '@playwright/test';

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
    trace: 'retain-on-failure', screenshot: 'only-on-failure', serviceWorkers: 'block' },
  webServer: { command: 'node scripts/tooling/e2e-servers.mjs', url: 'http://127.0.0.1:4709',
    reuseExistingServer: false, timeout: 180000, gracefulShutdown: { signal: 'SIGTERM', timeout: 15000 } },
});
