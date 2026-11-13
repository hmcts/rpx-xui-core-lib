import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';
const root = fileURLToPath(new URL('../../', import.meta.url));
const hostPort = Number(process.env.CORE_I18N_PORT || 4314);
export default defineConfig({
  globalSetup: '../evidence-host/setup.mjs',
  testDir: '.',
  testMatch: 'runner.spec.mjs',
  outputDir: `${root}/test-results/i18n/browser`,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: [['list'], ['junit', { outputFile: `${root}/test-results/i18n/driver-junit.xml` }]],
  use: { browserName: 'chromium', baseURL: `http://127.0.0.1:${hostPort}`, trace: 'retain-on-failure' },
  webServer: {
    command: 'node tests/evidence-host/start.mjs i18n',
    cwd: root,
    url: `http://127.0.0.1:${hostPort}`,
    reuseExistingServer: false,
    timeout: 120_000
  }
});
