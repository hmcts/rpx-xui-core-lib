import assert from 'node:assert/strict';
import { availableParallelism } from 'node:os';
import { test } from 'node:test';

async function loadConfig(mode) {
  const configUrl = new URL('./playwright.config.mjs', import.meta.url);
  configUrl.searchParams.set('mode', mode);
  return import(configUrl.href);
}

test('browser suite keeps Playwright defaults locally and scales CI workers to available CPUs', async () => {
  const previousCI = process.env.CI;
  try {
    delete process.env.CI;
    const localConfig = (await loadConfig('local')).default;
    assert.equal(localConfig.workers, undefined);

    process.env.CI = 'true';
    const ciConfig = (await loadConfig('ci')).default;
    assert.equal(ciConfig.workers, Math.max(1, Math.min(6, availableParallelism() - 2)));
  } finally {
    if (previousCI === undefined) delete process.env.CI;
    else process.env.CI = previousCI;
  }
});
