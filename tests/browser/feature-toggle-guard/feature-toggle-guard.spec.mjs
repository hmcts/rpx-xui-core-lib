import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.goto('/feature-toggle-guard'); });

test('feature guard allows a web route and redirects it when its flag is disabled', async ({ page }) => {
  await page.getByRole('button', { name: 'Open search' }).click();
  await expect(page).toHaveURL(/\/feature-toggle-guard\/search$/);
  await expect(page.getByRole('heading', { name: 'Search cases' })).toBeVisible();

  await page.getByRole('button', { name: 'Disable global search' }).click();
  await page.getByRole('button', { name: 'Open refunds' }).click();
  await expect(page).toHaveURL(/\/feature-toggle-guard\/refunds$/);
  await expect(page.getByRole('heading', { name: 'Refunds' })).toBeVisible();
  await page.getByRole('button', { name: 'Open search' }).click();
  await expect(page).toHaveURL(/\/feature-toggle-guard\/home$/);
  await expect(page.getByRole('heading', { name: 'Registration landing page' })).toBeVisible();
});

test('registration routes follow reciprocal feature expectations without a redirect loop', async ({ page }) => {
  await page.getByRole('button', { name: 'Open old registration' }).click();
  await expect(page).toHaveURL(/\/feature-toggle-guard\/register-old$/);
  await expect(page.getByRole('heading', { name: 'Old registration' })).toBeVisible();

  await page.getByRole('button', { name: 'Enable new registration' }).click();
  await page.getByRole('button', { name: 'Open home' }).click();
  await page.getByRole('button', { name: 'Open old registration' }).click();
  await expect(page).toHaveURL(/\/feature-toggle-guard\/register-new$/);
  await expect(page.getByRole('heading', { name: 'New registration' })).toBeVisible();

  await page.getByRole('button', { name: 'Disable new registration' }).click();
  await page.getByRole('button', { name: 'Open home' }).click();
  await page.getByRole('button', { name: 'Open new registration' }).click();
  await expect(page).toHaveURL(/\/feature-toggle-guard\/register-old$/);
  await expect(page.getByRole('heading', { name: 'Old registration' })).toBeVisible();
});
