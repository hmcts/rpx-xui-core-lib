import { defineConfig } from '@playwright/test';
import { packedLoadingBaseUrl } from './port.mjs';
export default defineConfig({
  testDir: '.', testMatch: ['loading.spec.mjs', 'translation.spec.mjs', 'filter.spec.mjs'], workers: 1, retries: 0,
  projects: [{ name: 'chromium' }],
  globalSetup: './setup.mjs',
  reporter: [['list'], ['json', { outputFile: process.env.CORE_LOADING_REPORT }]],
  outputDir: process.env.CORE_LOADING_OUTPUT,
  use: { browserName: 'chromium', baseURL: packedLoadingBaseUrl, trace: 'retain-on-failure' },
  webServer: { command: 'node serve.mjs', url: `${packedLoadingBaseUrl}/__loading_identity`, reuseExistingServer: false, timeout: 30000 },
});
