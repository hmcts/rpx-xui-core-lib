import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';
import { reporters } from '../reporters/config.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));

export default defineConfig({
  globalSetup: '../evidence-host/setup.mjs',
  outputDir: `${root}/test-results/browser`,
  testDir: '.',
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: reporters('browser'),
  use: { baseURL: 'http://127.0.0.1:4307', trace: 'retain-on-failure' },
  webServer: {
    command: 'node tests/evidence-host/start.mjs gallery',
    cwd: root,
    url: 'http://127.0.0.1:4307',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
