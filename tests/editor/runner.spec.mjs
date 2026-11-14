import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import { renderFeatureReport } from './feature-report.mjs';
import { missingSpecImports } from './spec-imports.mjs';
import { waitForRun } from './wait-for-run.mjs';

const required = JSON.parse(await readFile(new URL('./required-specs.json', import.meta.url), 'utf8'));

test('runs the required editor component contracts', async ({ page }) => {
  const errors = [];
  let report = { complete: false, events: [] };
  page.on('pageerror', error => errors.push(error.message));
  try {
    const entry = await readFile(new URL('./main.ts', import.meta.url), 'utf8');
    expect(missingSpecImports(entry, await readdir(new URL('.', import.meta.url), { recursive: true }))).toEqual([]);
    expect(new Set(required).size).toBe(required.length);
    await page.goto('/');
    await waitForRun(page, errors);
    report = { ...await page.evaluate(() => globalThis.__i18nReport), complete: false };
    const specs = report.events.filter(event => event.type === 'specDone');
    const started = report.events.find(event => event.type === 'jasmineStarted');
    expect(errors).toEqual([]);
    expect(started?.result.totalSpecsDefined).toBe(required.length);
    expect(report.events.find(event => event.type === 'jasmineDone').result.overallStatus, JSON.stringify(report.events.filter(event => event.result.failedExpectations?.length))).toBe('passed');
    expect(specs.map(event => event.result.fullName).sort()).toEqual([...required].sort());
    for (const event of report.events) {
      expect(event.result.failedExpectations ?? []).toEqual([]);
      if (event.type === 'specDone' || event.type === 'suiteDone') expect(event.result.status).toBe('passed');
    }
    report.complete = true;
  } catch (error) {
    report.driverError = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    if (!report.events.length) {
      const partial = await page.evaluate(() => globalThis.__i18nReport ?? null).catch(() => null);
      if (partial) report = { ...partial, complete: false, driverError: report.driverError };
    }
    report.browserErrors = errors;
    const output = fileURLToPath(new URL('../../test-results/editor/jasmine.json', import.meta.url));
    await mkdir(fileURLToPath(new URL('../../test-results/editor/', import.meta.url)), { recursive: true });
    await writeFile(output, JSON.stringify(report, null, 2) + '\n');
    await writeFile(fileURLToPath(new URL('../../test-results/editor/features.html', import.meta.url)), renderFeatureReport(report));
  }
});

test('opens the datetime calendar with the keyboard', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__i18nReport?.events.some(event => event.type === 'jasmineDone'));
  await page.evaluate(() => globalThis.createDatetimeToggleHost());
  const button = page.locator('ngx-mat-datepicker-toggle button');
  await button.focus();
  await expect(button).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('ngx-mat-calendar')).toBeVisible();
  await page.evaluate(() => globalThis.refreshDatetimeToggleHost());
  await expect(page.locator('ngx-mat-calendar .mat-calendar-body-cell').first()).toBeVisible();
  await page.locator('ngx-mat-calendar .mat-calendar-body-active').focus();
  await page.keyboard.press('Escape');
  await expect(page.locator('ngx-mat-calendar')).toHaveCount(0);
});

test('selects a date from the datetime calendar', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__i18nReport?.events.some(event => event.type === 'jasmineDone'));
  await page.evaluate(() => globalThis.createDatetimeToggleHost());
  const input = page.locator('input.mat-datepicker-input');
  await expect(input).toHaveValue('');
  await page.locator('ngx-mat-datepicker-toggle button').click();
  await page.evaluate(() => globalThis.refreshDatetimeToggleHost());
  const day = page.locator('ngx-mat-calendar .mat-calendar-body-active');
  await expect(day).toBeVisible();
  await day.click();
  await page.evaluate(() => globalThis.refreshDatetimeToggleHost());
  await expect(input).not.toHaveValue('');
});

test('edits rich text and serialises a numbered list', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__i18nReport?.events.some(event => event.type === 'jasmineDone'));
  await page.evaluate(() => globalThis.createRichTextHost());
  const editor = page.getByRole('textbox', { name: 'Notes' });
  await editor.click();
  await page.keyboard.type('First item');
  await expect(editor).toContainText('First item');
  await page.getByRole('button', { name: 'Numbered List', exact: true }).click();
  await expect(editor.locator('ol')).toContainText('First item');
  await expect.poll(() => page.evaluate(() => globalThis.readRichTextValue())).toContain('<ol');
  await expect.poll(() => page.evaluate(() => globalThis.readRichTextValue())).toContain('First item');
  expect(errors).toEqual([]);
});
