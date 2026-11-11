import { readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';

test('runs the native Jasmine translation contracts in Chromium', async ({ page }) => {
  const browserErrors = [];
  page.on('pageerror', error => browserErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });
  /** @type {{schemaVersion: number, complete: boolean, browserErrors: string[], events: {type: string, result: Record<string, unknown>}[], driverError?: string}} */
  let report = { schemaVersion: 1, complete: false, browserErrors, events: [] };
  try {
    const entry = await readFile(new URL('./main.ts', import.meta.url), 'utf8');
    for (const file of (await readdir(new URL('.', import.meta.url), { recursive: true })).filter(file => file.endsWith('.spec.ts'))) {
      expect(entry, `Missing translation spec import: ${file}`).toContain(`import './${file.slice(0, -3)}';`);
    }
    await page.goto('/');
    // Leave five seconds to save partial evidence before Playwright's 30-second test timeout.
    await page.waitForFunction("globalThis.__i18nReport?.events.some(event => event.type === 'jasmineDone')", undefined, { timeout: 25_000 });
    report = { ...await page.evaluate('globalThis.__i18nReport'), complete: false, browserErrors };
    expect(browserErrors).toEqual([]);
    const done = report.events.find(event => event.type === 'jasmineDone').result;
    const failures = report.events.filter(event => Array.isArray(event.result.failedExpectations) && event.result.failedExpectations.length);
    expect(done.overallStatus, JSON.stringify(failures, null, 2)).toBe('passed');
    expect(report.events.find(event => event.type === 'jasmineStarted').result.totalSpecsDefined).toBe(86);
    expect(report.events.filter(event => event.type === 'specDone')).toHaveLength(86);
    for (const event of report.events) {
      expect(event.result.failedExpectations ?? []).toEqual([]);
      expect(event.result.deprecationWarnings ?? []).toEqual([]);
      if (event.type === 'specDone' || event.type === 'suiteDone') expect(event.result.status).toBe('passed');
    }
    report.complete = true;
  } catch (error) {
    report.driverError = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    if (!report.events.length) {
      const partial = await page.evaluate('globalThis.__i18nReport ?? null').catch(() => null);
      if (partial) report = { ...partial, complete: false, browserErrors, driverError: report.driverError };
    }
    await writeFile(fileURLToPath(new URL('../../test-results/i18n/jasmine.json', import.meta.url)), JSON.stringify(report, null, 2) + '\n');
  }
});
