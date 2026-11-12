import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';
const root = fileURLToPath(new URL('../../', import.meta.url));
export default defineConfig({
  globalSetup: '../evidence-host/setup.mjs',
  testDir: '.',
  testMatch: 'runner.spec.mjs',
  outputDir: `${root}/test-results/i18n/browser`,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: [['list'], ['junit', { outputFile: `${root}/test-results/i18n/driver-junit.xml` }]],
  use: { browserName: 'chromium', baseURL: 'http://127.0.0.1:4314', trace: 'retain-on-failure' },
  webServer: {
    command: 'node tests/evidence-host/start.mjs i18n',
    cwd: root,
    url: 'http://127.0.0.1:4314',
    reuseExistingServer: false,
    timeout: 120_000
  }
});
