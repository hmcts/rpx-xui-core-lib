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
