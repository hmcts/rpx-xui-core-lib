import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';

const root = fileURLToPath(new URL('../../', import.meta.url));

export default defineConfig({
  outputDir: `${root}/test-results/browser`,
  testDir: '.',
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: `${root}/playwright-report` }], ['junit', { outputFile: `${root}/test-results/browser-junit.xml` }], ['json', { outputFile: `${root}/test-results/browser.json` }]],
  use: { baseURL: 'http://127.0.0.1:4307', trace: 'retain-on-failure' },
  webServer: {
    command: 'node scripts/dev.mjs',
    cwd: root,
    url: 'http://127.0.0.1:4307',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
