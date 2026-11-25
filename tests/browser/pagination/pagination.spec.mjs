import { test, expect } from '@playwright/test';

test('generic pagination preserves null events and exposes keyboard-operable page actions', async ({ page }) => {
  await page.goto('/pagination');
  const navigation = page.getByRole('navigation', { name: 'Search results pagination' });
  await expect(navigation).toBeVisible();
  await expect(navigation).toHaveAttribute('id', 'search-pagination');
  await expect(navigation.getByText('Previous page')).toBeVisible();

  const next = navigation.getByRole('link', { name: 'Next page' });
  await next.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('generic-event')).toHaveText('next:null');

  const previous = navigation.getByRole('link', { name: 'Previous page' });
  await previous.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('generic-event')).toHaveText('previous:null');
});

test('generic pagination disables next after the final result page', async ({ page }) => {
  await page.goto('/pagination');
  const navigation = page.getByRole('navigation', { name: 'Search results pagination' });
  await navigation.getByRole('link', { name: 'Next page' }).click();
  await navigation.getByRole('link', { name: 'Next page' }).click();

  await expect(navigation.getByRole('link', { name: 'Next page' })).toHaveCount(0);
  await expect(navigation.locator('span.hmcts-pagination__link').filter({ hasText: 'Next page' })).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'Previous page' })).toBeVisible();
});

test('HMCTS paginator is independently usable and keeps separate list state', async ({ page }) => {
  await page.goto('/pagination');
  const first = page.getByRole('navigation', { name: 'First list pagination' });
  const second = page.getByRole('navigation', { name: 'Second list pagination' });
  await first.getByRole('link', { name: /page 2/i }).click();
  await expect(page.getByTestId('hmcts-page')).toHaveText('2');
  await expect(page.getByTestId('hmcts-second-page')).toHaveText('1');
  await expect(first.locator('[aria-current="page"]')).toHaveText('2');
  await expect(second.locator('[aria-current="page"]')).toHaveText('1');
});

test('HMCTS paginator reflects the final page and its visible result range', async ({ page }) => {
  await page.goto('/pagination');
  const navigation = page.getByRole('navigation', { name: 'First list pagination' });
  await navigation.getByRole('link', { name: /page 3/i }).click();

  await expect(navigation.locator('[aria-current="page"]')).toHaveText('3');
  await expect(navigation.getByRole('link', { name: /next/i })).toHaveCount(0);
  await expect(navigation.getByRole('link', { name: /previous/i })).toBeVisible();
  await expect(navigation.locator('.hmcts-pagination__results')).toHaveText('Showing 21 to 25 of 25 results');
});

test('HMCTS paginator hides page controls and result count for a single-page list', async ({ page }) => {
  await page.goto('/pagination');
  const navigation = page.getByRole('navigation', { name: 'Single result pagination' });

  await expect(navigation.locator('.hmcts-pagination__list')).toHaveCount(0);
  await expect(navigation.locator('.hmcts-pagination__results')).toHaveCount(0);
  await expect(navigation.getByRole('link')).toHaveCount(0);
});

test('pagination entries have no automated accessibility violations', async ({ page }) => {
  await page.goto('/pagination');
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  const result = await new AxeBuilder({ page }).include('main').analyze();
  expect(result.violations).toEqual([]);
});
