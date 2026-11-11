import { expect, test } from '@playwright/test';

test('spinner displays default, updated and translated text', async ({ page }) => {
  await page.goto('/spinner');
  const spinners = page.locator('xuilib-loading-spinner');
  const defaultSpinner = spinners.nth(0);
  const spinner = spinners.nth(1);
  await expect(spinners).toHaveCount(2);
  await expect(defaultSpinner.locator('.spinner-container')).toBeVisible();
  await expect(defaultSpinner.getByRole('status')).toHaveText('Loading');
  await expect(defaultSpinner.locator('.spinner')).toHaveAttribute('aria-hidden', 'true');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(defaultSpinner.locator('.spinner')).toHaveCSS('animation-name', 'none');
  await expect(spinner.locator('p')).toHaveText('Loading');
  await page.getByRole('button', { name: 'Custom message' }).click();
  await expect(spinner.locator('p')).toHaveText('Searching');
  const response = page.waitForResponse('**/translations/cy');
  await page.getByRole('button', { name: 'Cymraeg' }).click();
  expect((await response).status()).toBe(200);
  await expect(spinner.getByRole('status')).toHaveText('Chwilio');
  await page.getByRole('button', { name: 'Hide spinner' }).click();
  await expect(spinners).toHaveCount(0);
});
