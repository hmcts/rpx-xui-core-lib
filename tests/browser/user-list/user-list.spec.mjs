import { test, expect } from '@playwright/test';

test('users without a route can be selected with the keyboard', async ({ page }) => {
  await page.goto('/user-list');
  await page.keyboard.press('Tab');
  await expect(page.getByText('Synthetic User 1', { exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('selected')).toHaveText('Synthetic User 1');
});

test('users with a route retain a navigable link and emit selection', async ({ page }) => {
  await page.goto('/user-list');
  const link = page.getByRole('link', { name: 'Synthetic User 2' });
  await expect(link).toHaveAttribute('href', '/user-list');
  await expect(link).toHaveAttribute('title', 'View user');
  await link.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('selected')).toHaveText('Synthetic User 2');
});

test('user list pages through users and emits the chosen user', async ({ page }) => {
  await page.goto('/user-list');
  await expect(page.locator('tbody tr')).toHaveCount(50);
  await expect(page.getByText('Synthetic User 55', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.getByTestId('page')).toHaveText('2');
  await expect(page.locator('tbody tr')).toHaveCount(5);
  await page.getByText('Synthetic User 55', { exact: true }).click();
  await expect(page.getByTestId('selected')).toHaveText('Synthetic User 55');
});

test('pagination can be operated with the keyboard', async ({ page }) => {
  await page.goto('/user-list');
  const next = page.getByRole('button', { name: 'Next page' });
  await next.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('page')).toHaveText('2');
  await expect(page.getByText('Synthetic User 55', { exact: true })).toBeVisible();
});

test('user list and pagination have no automated accessibility violations', async ({ page }) => {
  await page.goto('/user-list');
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  const result = await new AxeBuilder({ page }).include('xuilib-user-list').analyze();
  expect(result.violations).toEqual([]);
});
