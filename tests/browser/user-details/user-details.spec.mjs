import { test, expect } from '@playwright/test';

test('user details shows roles and emits a suspend action', async ({ page }) => {
  await page.goto('/user-details');
  await expect(page.getByText('Synthetic User')).toBeVisible();
  await expect(page.getByText('Case access administrator')).toBeVisible();
  await page.getByRole('button', { name: 'Suspend account' }).click();
  await expect(page.getByTestId('event')).toHaveText('suspend:user@example.invalid');
});

test('pending user hides permissions and emits a reinvite action', async ({ page }) => {
  await page.goto('/user-details');
  await page.getByRole('button', { name: 'Pending user' }).click();
  await expect(page.getByText('Case access administrator')).toHaveCount(0);
  await page.getByRole('button', { name: 'Resend invitation' }).click();
  await expect(page.getByTestId('event')).toHaveText('reinvite:user@example.invalid');
});

test('user details actions work from the keyboard and pass an axe scan', async ({ page }) => {
  await page.goto('/user-details');
  const button = page.getByRole('button', { name: 'Suspend account' });
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('event')).toHaveText('suspend:user@example.invalid');
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  const result = await new AxeBuilder({ page }).include('xuilib-user-details').analyze();
  expect(result.violations).toEqual([]);
});
