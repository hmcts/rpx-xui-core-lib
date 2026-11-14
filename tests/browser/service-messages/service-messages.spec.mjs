import { test, expect } from '@playwright/test';

test('renders sanitized message and dismisses it with the keyboard across reloads', async ({ page }) => {
  await page.goto('/service-messages');
  const message = page.locator('xuilib-service-message');
  await expect(message.locator('strong')).toHaveText('available');
  await expect(message.locator('[onerror]')).toHaveCount(0);
  expect(await page.evaluate(() => Reflect.get(window, "serviceMessageExecuted"))).toBeUndefined();
  await page.keyboard.press('Tab');
  const hide = page.getByRole('button', { name: 'Hide message' });
  await expect(hide).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(message).toHaveCount(0);
  await page.reload();
  await expect(message).toHaveCount(0);
});

test('service messages have no automated accessibility violations', async ({ page }) => {
  await page.goto('/service-messages');
  await expect(page.getByRole('button', { name: 'Hide message' })).toBeVisible();
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  const result = await new AxeBuilder({ page }).include('xuilib-service-messages').analyze();
  expect(result.violations).toEqual([]);
});

test('a corrupt dismissal cookie does not hide service messages', async ({ page, context }) => {
  await context.addCookies([{ name: 'core-test-hidden', value: '%not-json', url: 'http://127.0.0.1:4307' }]);
  await page.goto('/service-messages');
  await expect(page.getByRole('button', { name: 'Hide message' })).toBeVisible();
  await page.getByRole('button', { name: 'Hide message' }).click();
  await expect(page.locator('xuilib-service-message')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('xuilib-service-message')).toHaveCount(0);
});
