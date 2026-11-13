import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.', testMatch: ['loading.spec.mjs', 'translation.spec.mjs'], workers: 1, retries: 0,
  projects: [{ name: 'chromium' }],
  globalSetup: './setup.mjs',
  reporter: [['list'], ['json', { outputFile: process.env.CORE_LOADING_REPORT }]],
  outputDir: process.env.CORE_LOADING_OUTPUT,
  use: { browserName: 'chromium', baseURL: 'http://127.0.0.1:14880', trace: 'retain-on-failure' },
  webServer: { command: 'node serve.mjs', url: 'http://127.0.0.1:14880/__loading_identity', reuseExistingServer: false, timeout: 30000 },
});
