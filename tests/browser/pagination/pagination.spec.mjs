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

test('pagination entries have no automated accessibility violations', async ({ page }) => {
  await page.goto('/pagination');
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  const result = await new AxeBuilder({ page }).include('main').analyze();
  expect(result.violations).toEqual([]);
});
