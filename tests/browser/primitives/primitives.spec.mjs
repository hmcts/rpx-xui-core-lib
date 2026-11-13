import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => { await page.goto('/primitives'); });

test('banner renders and removes the configured success message and icon', async ({ page }) => {
  const banner = page.locator('xuilib-hmcts-banner');
  const successBanner = banner.locator('.hmcts-banner--success');
  await expect(successBanner).toBeVisible();
  await expect(successBanner).toHaveCSS('border-top-width', '5px');
  await expect(banner.locator('.hmcts-banner__message')).toHaveCSS('font-size', '19px');
  await expect(banner.locator('.hmcts-banner__icon--success')).toBeVisible();
  await expect(banner).toContainText('Saved');
  await page.getByRole('button', { name: 'Toggle banner' }).click();
  await expect(banner.locator('.hmcts-banner')).toHaveCount(0);
});

test('form label associates the field and retains optional heading variants', async ({ page }) => {
  const field = page.getByRole('textbox', { name: /Case name/ });
  await expect(field).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Case name');
  await expect(page.locator('label[for="caseName"]')).toContainText('(optional)');
  await page.getByRole('button', { name: 'Toggle label heading' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(0);
  await expect(field).toBeVisible();
});

test('heading label and banner use translated messages', async ({ page }) => {
  const response = page.waitForResponse('**/translations/cy');
  await page.getByRole('button', { name: 'Cymraeg' }).click();
  expect((await response).status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Enw achos');
  await expect(page.locator('xuilib-hmcts-banner')).toContainText('Wedi cadw');
});

test('primitives pass scoped serious accessibility checks', async ({ page }) => {
  await expect(page.locator('xuilib-hmcts-banner .hmcts-banner--success')).toBeVisible();
  await expect(page.getByRole('textbox', { name: /Case name/ })).toBeVisible();
  const result = await new AxeBuilder({ page }).include('core-primitives-host').analyze();
  expect(result.violations.filter(item => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);
});

test('non-heading label preserves supplied text when language changes', async ({ page }) => {
  await page.getByRole('button', { name: 'Toggle label heading' }).click();
  const response = page.waitForResponse('**/translations/cy');
  await page.getByRole('button', { name: 'Cymraeg' }).click();
  expect((await response).status()).toBe(200);
  await expect(page.getByRole('textbox', { name: /Case name/ })).toBeVisible();
  await expect(page.locator('xuilib-hmcts-banner')).toContainText('Wedi cadw');
});
