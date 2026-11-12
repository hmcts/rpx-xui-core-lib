import { expect, test } from '@playwright/test';

test('window provider injects the real browser global without copying it', async ({ page }) => {
  await page.goto('/window');
  await expect(page.getByRole('heading', {name:'Window provider test host'})).toBeVisible();
  expect(await page.evaluate(() => window.windowProbe === window)).toBe(true);
});
