import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/commonlib-primitives');
  await expect(page.getByRole('heading', { name: 'CommonLib primitives' })).toBeVisible();
});

test('let directive updates both template variables without recreating its view', async ({ page }) => {
  const view = page.getByTestId('let-view');
  const initial = await view.evaluateHandle(element => element);

  await expect(page.getByTestId('let-implicit')).toHaveText('first');
  await expect(page.getByTestId('let-alias')).toHaveText('first');
  await page.getByRole('button', { name: 'Update value' }).click();
  await expect(page.getByTestId('let-implicit')).toHaveText('second');
  await expect(page.getByTestId('let-alias')).toHaveText('second');
  expect(await initial.evaluate(element => element.isConnected)).toBe(true);
});

test('let directive renders false and zero values rather than treating them as conditions', async ({ page }) => {
  await expect(page.getByTestId('let-false')).toHaveText('false');
  await expect(page.getByTestId('let-zero')).toHaveText('0');
});

test('tabs translate labels and emit the selected index and tab on keyboard navigation', async ({ page }) => {
  const tablist = page.getByRole('tablist');
  await page.getByRole('button', { name: 'Cymraeg' }).click();
  const overview = tablist.getByRole('tab', { name: 'Trosolwg' });
  const history = tablist.getByRole('tab', { name: 'Hanes' });
  await expect(overview).toHaveAttribute('aria-selected', 'true');
  await history.focus();
  await history.press('Enter');
  await expect(history).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('tab-change-index')).toHaveText('1');
  await expect(page.getByTestId('tab-change-label')).toHaveText('Hanes');

  const results = await new AxeBuilder({ page }).include('main').analyze();
  expect(results.violations).toEqual([]);
});

test('identity bar translates the supplied name and disappears when the identity is cleared', async ({ page }) => {
  const identity = page.locator('.hmcts-identity-bar');
  await expect(identity).toHaveCount(0);
  await page.getByRole('button', { name: 'Set identity' }).click();
  await expect(identity).toContainText('Synthetic caseworker');
  await page.getByRole('button', { name: 'Cymraeg' }).click();
  await expect(identity).toContainText('Gweithiwr achos synthetig');
  await page.getByRole('button', { name: 'Clear identity' }).click();
  await expect(identity).toHaveCount(0);
});

test('GOV.UK table translates its labels, formats date cells once and keeps row links', async ({ page }) => {
  const table = page.locator('xuilib-gov-uk-table table').first();
  await expect(table).toBeVisible();
  await expect(table).toHaveAccessibleName('Synthetic cases');
  await expect(table.getByRole('columnheader')).toHaveText(['Case name', 'Date opened', 'View case']);
  const row = table.getByRole('row', { name: /SYN-123/ });
  await expect(row.getByRole('rowheader')).toHaveText('SYN-123');
  await expect(row.getByRole('cell').nth(0)).toHaveText('02/01/2026');
  await expect(row.getByRole('link', { name: 'Open case' })).toHaveAttribute('href', '/cases/SYN-123');
  await expect(table.getByRole('row', { name: /SYN-124/ }).getByRole('cell').nth(0)).toHaveText('03/02/2026');

  await page.getByRole('button', { name: 'Cymraeg' }).click();
  await expect(table).toHaveAccessibleName('Achosion synthetig');
  await expect(table.getByRole('columnheader')).toHaveText(['Enw achos', 'Dyddiad agor', 'Gweld achos']);
  const results = await new AxeBuilder({ page }).include('main').analyze();
  expect(results.violations).toEqual([]);
});

test('GOV.UK table preserves custom classes and renders data cells when row headers are disabled', async ({ page }) => {
  const table = page.locator('table.core-flat-table');
  await expect(table).toHaveAccessibleName('Synthetic flat cases');
  const row = table.getByRole('row', { name: /SYN-222/ });
  await expect(row.getByRole('rowheader')).toHaveCount(0);
  await expect(row.getByRole('cell')).toHaveText(['SYN-222', '04/03/2026', 'Open case']);
});
