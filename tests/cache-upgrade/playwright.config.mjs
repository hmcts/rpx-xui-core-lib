import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';

const root = fileURLToPath(new URL('../../', import.meta.url));
export default defineConfig({
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  testDir: '.', testMatch: 'cache.spec.mjs', workers: 1, retries: 0,
  outputDir: `${root}/test-results/cache-upgrade-browser`,
  reporter: [['list'], ['html', { open: 'never', outputFolder: `${root}/test-results/cache-upgrade-html` }], ['junit', { outputFile: `${root}/test-results/cache-upgrade-junit.xml` }], ['json', { outputFile: `${root}/test-results/cache-upgrade-report.json` }]],
  use: { baseURL: 'http://127.0.0.1:4414', trace: 'retain-on-failure' },
  webServer: { command: 'node tests/cache-upgrade/serve.mjs', cwd: root, url: 'http://127.0.0.1:4414/?app=legacy', reuseExistingServer: false, timeout: 10_000 },
});
