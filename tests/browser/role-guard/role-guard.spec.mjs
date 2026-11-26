import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.goto('/role-guard'); });

test('role guard waits for initialized roles and redirects routes without a match', async ({ page }) => {
  await page.getByRole('button', { name: 'Open staff route' }).click();
  await expect(page).toHaveURL(/\/role-guard\/?$/);
  await expect(page.getByRole('heading', { name: 'Staff route' })).not.toBeVisible();

  await page.getByRole('button', { name: 'Load staff-admin role' }).click();
  await page.getByRole('button', { name: 'Open staff route' }).click();
  await expect(page).toHaveURL(/\/role-guard\/staff$/);
  await expect(page.getByRole('heading', { name: 'Staff route' })).toBeVisible();

  await page.getByRole('button', { name: 'Load caseworker role' }).click();
  await page.getByRole('button', { name: 'Open all-roles route' }).click();
  await expect(page).toHaveURL(/\/role-guard\/fallback$/);
  await page.getByRole('button', { name: 'Open staff route' }).click();
  await expect(page).toHaveURL(/\/role-guard\/fallback$/);
  await expect(page.getByRole('heading', { name: 'Role fallback page' })).toBeVisible();
});

test('role guard ALL mode requires every configured role', async ({ page }) => {
  await page.getByRole('button', { name: 'Load staff-admin role' }).click();
  await page.getByRole('button', { name: 'Open all-roles route' }).click();
  await expect(page).toHaveURL(/\/role-guard\/fallback$/);

  await page.getByRole('button', { name: 'Load both roles' }).click();
  await page.getByRole('button', { name: 'Open all-roles route' }).click();
  await expect(page).toHaveURL(/\/role-guard\/all-roles$/);
  await expect(page.getByRole('heading', { name: 'All roles route' })).toBeVisible();
});
