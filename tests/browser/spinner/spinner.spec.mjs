import { expect, test } from '@playwright/test';

test('spinner displays default, updated and translated text', async ({ page }) => {
  await page.goto('/spinner');
  const spinners = page.locator('xuilib-loading-spinner');
  const defaultSpinner = spinners.nth(0);
  const spinner = spinners.nth(1);
  await expect(spinners).toHaveCount(2);
  await expect(defaultSpinner.locator('.spinner-container')).toBeVisible();
  await expect(defaultSpinner.locator('p')).toHaveText('Loading');
  await expect(spinner.locator('p')).toHaveText('Loading');
  await page.getByRole('button', { name: 'Custom message' }).click();
  await expect(spinner.locator('p')).toHaveText('Searching');
  const response = page.waitForResponse('**/translations/cy');
  await page.getByRole('button', { name: 'Cymraeg' }).click();
  expect((await response).status()).toBe(200);
  await expect(spinner.locator('p')).toHaveText('Chwilio');
  await page.getByRole('button', { name: 'Hide spinner' }).click();
  await expect(spinners).toHaveCount(0);
});
