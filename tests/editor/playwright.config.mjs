import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';
import { configuredWorkerCount } from '../browser/worker-count.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const port = Number(process.env.CORE_EDITOR_PORT || 4315);

export default defineConfig({
  testDir: '.',
  testMatch: 'runner.spec.mjs',
  outputDir: `${root}/test-results/editor/browser`,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  fullyParallel: true,
  workers: configuredWorkerCount(),
  reporter: [['list'], ['junit', { outputFile: `${root}/test-results/editor/driver-junit.xml` }], ['json', { outputFile: `${root}/test-results/editor/driver.json` }]],
  projects: [{ name: 'chromium' }],
  use: { browserName: 'chromium', baseURL: `http://127.0.0.1:${port}`, trace: 'retain-on-failure' },
  webServer: {
    command: `node tests/editor/start.mjs ${port}`,
    cwd: root,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000
  }
});
