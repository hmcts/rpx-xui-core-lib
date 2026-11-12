import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';
import { reporters } from '../reporters/config.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
export default defineConfig({
  globalSetup: '../evidence-host/setup.mjs',
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  testDir: '.', testMatch: 'cache.spec.mjs', workers: 1, retries: 0,
  outputDir: `${root}/test-results/cache-upgrade-browser`,
  reporter: reporters('cache-upgrade'),
  use: { baseURL: 'http://127.0.0.1:4414', trace: 'retain-on-failure' },
  webServer: { command: 'node tests/cache-upgrade/serve.mjs', cwd: root, url: 'http://127.0.0.1:4414/?app=legacy', reuseExistingServer: false, timeout: 10_000 },
});
