import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  testDir: '.',
  testMatch: ['person.spec.mjs', 'a11y-proof.spec.mjs', 'localized-name.spec.mjs', 'reuse-proof.spec.mjs'],
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4319', browserName: 'chromium', trace: 'retain-on-failure' },
  webServer: { command: 'CORE_HOST_PORT=4319 node scripts/dev.mjs', cwd: fileURLToPath(new URL('../../..', import.meta.url)), url: 'http://127.0.0.1:4319', reuseExistingServer: false, timeout: 120_000 },
});
