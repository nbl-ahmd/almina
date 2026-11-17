import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/design-proof",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 30000,
  expect: { timeout: 10000 },
  reporter: [["list"]],
  outputDir:
    ".verification-results/storefront-replacement/p1-04/test-artifacts",
  use: {
    baseURL: "http://127.0.0.1:4896",
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node scripts/tooling/storefront-direction-proof.mjs --test",
    url: "http://127.0.0.1:4896/design-proof",
    reuseExistingServer: false,
    timeout: 120000,
    gracefulShutdown: { signal: "SIGTERM", timeout: 10000 },
  },
});
