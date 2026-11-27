import assert from 'node:assert/strict';
import { availableParallelism } from 'node:os';
import { test } from 'node:test';
import { ciWorkerCount } from './worker-count.mjs';

async function loadConfig(mode) {
  const configUrl = new URL('./playwright.config.mjs', import.meta.url);
  configUrl.searchParams.set('mode', mode);
  return import(configUrl.href);
}

test('browser suite keeps Playwright defaults locally and scales CI workers to available CPUs', async () => {
  const previousCI = process.env.CI;
  const previousWorkers = process.env.PLAYWRIGHT_WORKERS;
  try {
    delete process.env.CI;
    delete process.env.PLAYWRIGHT_WORKERS;
    const localConfig = (await loadConfig('local')).default;
    assert.equal(localConfig.workers, undefined);

    process.env.CI = 'true';
    const ciConfig = (await loadConfig('ci')).default;
    assert.equal(ciConfig.workers, Math.max(1, Math.min(6, availableParallelism() - 2)));
  } finally {
    if (previousCI === undefined) delete process.env.CI;
    else process.env.CI = previousCI;
    if (previousWorkers === undefined) delete process.env.PLAYWRIGHT_WORKERS;
    else process.env.PLAYWRIGHT_WORKERS = previousWorkers;
  }
});

test('CI worker count reserves available CPU capacity and respects its bounds', () => {
  assert.equal(ciWorkerCount(1), 1);
  assert.equal(ciWorkerCount(2), 1);
  assert.equal(ciWorkerCount(4), 2);
  assert.equal(ciWorkerCount(8), 6);
  assert.equal(ciWorkerCount(32), 6);
});

test('an explicit Playwright worker count is honored and invalid values fail fast', async () => {
  const previousWorkers = process.env.PLAYWRIGHT_WORKERS;
  const previousCI = process.env.CI;
  try {
    delete process.env.CI;
    process.env.PLAYWRIGHT_WORKERS = '8';
    assert.equal((await loadConfig('eight-workers')).default.workers, 8);

    process.env.PLAYWRIGHT_WORKERS = '0';
    await assert.rejects(loadConfig('invalid-workers'), /PLAYWRIGHT_WORKERS must be a positive integer/);
  } finally {
    if (previousWorkers === undefined) delete process.env.PLAYWRIGHT_WORKERS;
    else process.env.PLAYWRIGHT_WORKERS = previousWorkers;
    if (previousCI === undefined) delete process.env.CI;
    else process.env.CI = previousCI;
  }
});
