import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/hmcts-shell');
  await expect(page.getByRole('heading', { name: 'Case management' })).toBeVisible();
});

test('sub-navigation exposes its label, active page, item links and roundel', async ({ page }) => {
  const navigation = page.getByRole('navigation', { name: 'Case tasks' });
  await expect(navigation.getByRole('link', { name: 'Open cases 3' })).toHaveAttribute('aria-current', 'page');
  await expect(navigation.getByRole('link', { name: 'Closed cases' })).not.toHaveAttribute('aria-current');
  await expect(navigation.getByRole('link', { name: 'Open cases 3' })).toHaveAttribute('href', /\/cases\/open$/);
});

test('error summary focuses the summary, links to a present field and reports missing targets as text', async ({ page }) => {
  const originalTitle = await page.title();
  await page.getByRole('button', { name: 'Show errors' }).click();

  const summary = page.getByRole('alert');
  await expect(summary).toBeVisible();
  await expect(summary).toBeFocused();
  await expect(page).toHaveTitle(`Error: ${originalTitle}`);
  const caseReferenceLink = summary.getByRole('link', { name: 'Enter the case reference' });
  await expect(caseReferenceLink).toBeVisible();
  await expect(caseReferenceLink).toHaveAttribute('href', /#case-reference$/);
  await expect(summary.getByRole('link', { name: 'Enter the second case reference' })).toBeVisible();
  await expect(summary.getByText('A field that is not on this page')).toBeVisible();

  await summary.getByRole('link', { name: 'Enter the case reference' }).click();
  await expect(page.locator('#case-reference')).toBeFocused();
  await summary.getByRole('link', { name: 'Enter the second case reference' }).click();
  await expect(page.locator('#case\\:reference')).toBeFocused();
});

test('clearing errors hides the summary and removes only the error title prefix', async ({ page }) => {
  const originalTitle = await page.title();
  await page.getByRole('button', { name: 'Show errors' }).click();
  await expect(page).toHaveTitle(`Error: ${originalTitle}`);

  await page.getByRole('button', { name: 'Clear errors' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page).toHaveTitle(originalTitle);
});

test('warning state does not expose an error summary or change the page title', async ({ page }) => {
  const originalTitle = await page.title();
  await page.getByRole('button', { name: 'Show warning' }).click();

  await expect(page.getByText('Warning', { exact: true })).toBeVisible();
  await expect(page.getByText('A service notice is active')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveClass(/hmcts-banner--warning/);
  await expect(page).toHaveTitle(originalTitle);
});

test('HMCTS shell controls have no automated accessibility violations', async ({ page }) => {
  await page.getByRole('button', { name: 'Show errors' }).click();
  const results = await new AxeBuilder({ page }).include('main').analyze();
  expect(results.violations).toEqual([]);
});
